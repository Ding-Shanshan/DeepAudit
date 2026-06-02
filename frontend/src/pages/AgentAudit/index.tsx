/**
 * Agent Audit Page - Phase-driven Layout
 * 让用户直观看出任务如何执行：阶段流程条 + 阶段详情 + Agent/统计概览
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAgentStream } from "@/hooks/useAgentStream";

import {
  getAgentTask,
  getAgentFindings,
  cancelAgentTask,
  getAgentTree,
  getAgentEvents,
  AgentEvent,
} from "@/shared/api/agentTasks";
import CreateAgentTaskDialog from "@/components/agent/CreateAgentTaskDialog";

// Local imports
import {
  SplashScreen,
  Header,
  AgentTreeNodeItem,
  AgentDetailPanel,
  StatsPanel,
  AgentErrorBoundary,
  PhaseStepper,
} from "./components";
import ReportExportDialog from "./components/ReportExportDialog";
import { useAgentAuditState } from "./hooks";
import { ACTION_VERBS, POLLING_INTERVALS } from "./constants";
import { cleanThinkingContent, truncateOutput, inferPhaseFromEvent, inferInitialPhase } from "./utils";
import type { AuditPhase } from "./types";
import { AUDIT_PHASES } from "./types";

function AgentAuditPageContent() {
  const { taskId } = useParams<{ taskId: string }>();
  const {
    task, findings, agentTree, logs, selectedAgentId, showAllLogs,
    isLoading, connectionStatus, isAutoScroll, expandedLogIds,
    treeNodes, filteredLogs, isRunning, isComplete,
    currentPhase, completedPhases,
    setTask, setFindings, setAgentTree, addLog, updateLog, removeLog,
    selectAgent, setLoading, setConnectionStatus, setAutoScroll, toggleLogExpanded,
    setCurrentAgentName, getCurrentAgentName, setCurrentThinkingId, getCurrentThinkingId,
    setCurrentPhase, completePhase,
    dispatch, reset,
  } = useAgentAuditState();

  // Local state
  const [showSplash, setShowSplash] = useState(!taskId);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [statusVerb, setStatusVerb] = useState(ACTION_VERBS[0]);
  const [statusDots, setStatusDots] = useState(0);
  const [expandedPhases, setExpandedPhases] = useState<Set<AuditPhase>>(new Set());

  const logEndRef = useRef<HTMLDivElement>(null);
  const phaseScrollRef = useRef<HTMLDivElement>(null);
  const agentTreeRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAgentTreeRefreshTime = useRef<number>(0);
  const previousTaskIdRef = useRef<string | undefined>(undefined);
  const disconnectStreamRef = useRef<(() => void) | null>(null);
  const lastEventSequenceRef = useRef<number>(0);
  const hasConnectedRef = useRef<boolean>(false);
  const hasLoadedHistoricalEventsRef = useRef<boolean>(false);
  const [afterSequence, setAfterSequence] = useState<number>(0);
  const [historicalEventsLoaded, setHistoricalEventsLoaded] = useState<boolean>(false);

  // 🔥 当 taskId 变化时立即重置状态
  useEffect(() => {
    if (taskId !== previousTaskIdRef.current) {
      if (disconnectStreamRef.current) {
        disconnectStreamRef.current();
        disconnectStreamRef.current = null;
      }
      reset();
      setShowSplash(!taskId);
      lastEventSequenceRef.current = 0;
      hasConnectedRef.current = false;
      hasLoadedHistoricalEventsRef.current = false;
      setHistoricalEventsLoaded(false);
      setAfterSequence(0);
    }
    previousTaskIdRef.current = taskId;
  }, [taskId, reset]);

  // ============ Phase Log Grouping ============

  const phaseLogMap: Record<string, typeof logs[0][]> = {};
  for (const phase of AUDIT_PHASES) {
    phaseLogMap[phase] = [];
  }
  for (const log of logs) {
    const phase = log.phase || currentPhase;
    if (!phaseLogMap[phase]) phaseLogMap[phase] = [];
    phaseLogMap[phase].push(log);
  }
  const currentPhaseLogs = phaseLogMap[currentPhase] || [];

  // Auto scroll to bottom when new logs arrive
  useEffect(() => {
    if (isAutoScroll && phaseScrollRef.current) {
      phaseScrollRef.current.scrollTop = phaseScrollRef.current.scrollHeight;
    }
  }, [currentPhaseLogs.length, isAutoScroll]);

  const togglePhaseExpanded = (phase: AuditPhase) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) {
        next.delete(phase);
      } else {
        next.add(phase);
      }
      return next;
    });
  };

  // ============ Data Loading ============

  const loadTask = useCallback(async () => {
    if (!taskId) return;
    try {
      const data = await getAgentTask(taskId);
      setTask(data);
      // 🔥 从 task 数据推断初始阶段
      const initialPhase = inferInitialPhase(data.status, data.current_phase);
      setCurrentPhase(initialPhase);
    } catch {
      toast.error("Failed to load task");
    }
  }, [taskId, setTask, setCurrentPhase]);

  const loadFindings = useCallback(async () => {
    if (!taskId) return;
    try {
      const data = await getAgentFindings(taskId);
      setFindings(data);
    } catch (err) {
      console.error(err);
    }
  }, [taskId, setFindings]);

  const loadAgentTree = useCallback(async () => {
    if (!taskId) return;
    try {
      const data = await getAgentTree(taskId);
      setAgentTree(data);
    } catch (err) {
      console.error(err);
    }
  }, [taskId, setAgentTree]);

  const debouncedLoadAgentTree = useCallback(() => {
    const now = Date.now();
    const minInterval = POLLING_INTERVALS.AGENT_TREE_DEBOUNCE;

    if (agentTreeRefreshTimer.current) {
      clearTimeout(agentTreeRefreshTimer.current);
    }

    const timeSinceLastRefresh = now - lastAgentTreeRefreshTime.current;
    if (timeSinceLastRefresh < minInterval) {
      agentTreeRefreshTimer.current = setTimeout(() => {
        lastAgentTreeRefreshTime.current = Date.now();
        loadAgentTree();
      }, minInterval - timeSinceLastRefresh);
    } else {
      agentTreeRefreshTimer.current = setTimeout(() => {
        lastAgentTreeRefreshTime.current = Date.now();
        loadAgentTree();
      }, POLLING_INTERVALS.AGENT_TREE_MIN_DELAY);
    }
  }, [loadAgentTree]);

  // 🔥 加载历史事件并推断阶段
  const loadHistoricalEvents = useCallback(async () => {
    if (!taskId) return 0;

    if (hasLoadedHistoricalEventsRef.current) {
      console.log('[AgentAudit] Historical events already loaded, skipping');
      return 0;
    }
    hasLoadedHistoricalEventsRef.current = true;

    try {
      console.log(`[AgentAudit] Fetching historical events for task ${taskId}...`);
      const events = await getAgentEvents(taskId, { limit: 500 });
      console.log(`[AgentAudit] Received ${events.length} events from API`);

      if (events.length === 0) {
        console.log('[AgentAudit] No historical events found');
        return 0;
      }

      events.sort((a: AgentEvent, b: AgentEvent) => a.sequence - b.sequence);

      let processedCount = 0;
      let inferredPhase: AuditPhase = currentPhase;

      events.forEach((event: AgentEvent) => {
        if (event.sequence > lastEventSequenceRef.current) {
          lastEventSequenceRef.current = event.sequence;
        }

        // 🔥 推断阶段
        inferredPhase = inferPhaseFromEvent(
          event.event_type,
          event.phase,
          event.metadata as Record<string, unknown> | null,
          inferredPhase
        );

        const agentName = (event.metadata?.agent_name as string) ||
          (event.metadata?.agent as string) ||
          undefined;

        // 根据事件类型创建日志项
        switch (event.event_type) {
          case 'thinking':
          case 'llm_thought':
          case 'llm_decision':
          case 'llm_start':
          case 'llm_complete':
          case 'llm_action':
          case 'llm_observation':
            dispatch({
              type: 'ADD_LOG',
              payload: {
                type: 'thinking',
                title: event.message?.slice(0, 100) + (event.message && event.message.length > 100 ? '...' : '') || 'Thinking...',
                content: event.message || (event.metadata?.thought as string) || '',
                agentName,
                phase: inferredPhase,
              }
            });
            processedCount++;
            break;

          case 'tool_call':
            dispatch({
              type: 'ADD_LOG',
              payload: {
                type: 'tool',
                title: `Tool: ${event.tool_name || 'unknown'}`,
                content: event.tool_input ? `Input:\n${JSON.stringify(event.tool_input, null, 2)}` : '',
                tool: { name: event.tool_name || 'unknown', status: 'running' as const },
                agentName,
                phase: inferredPhase,
              }
            });
            processedCount++;
            break;

          case 'tool_result':
            dispatch({
              type: 'ADD_LOG',
              payload: {
                type: 'tool',
                title: `Completed: ${event.tool_name || 'unknown'}`,
                content: event.tool_output
                  ? `Output:\n${truncateOutput(typeof event.tool_output === 'string' ? event.tool_output : JSON.stringify(event.tool_output, null, 2))}`
                  : '',
                tool: { name: event.tool_name || 'unknown', duration: event.tool_duration_ms || 0, status: 'completed' as const },
                agentName,
                phase: inferredPhase,
              }
            });
            processedCount++;
            break;

          case 'finding':
          case 'finding_new':
          case 'finding_verified':
            dispatch({
              type: 'ADD_LOG',
              payload: {
                type: 'finding',
                title: event.message || (event.metadata?.title as string) || 'Vulnerability found',
                severity: (event.metadata?.severity as string) || 'medium',
                agentName,
                phase: inferredPhase,
              }
            });
            processedCount++;
            break;

          case 'dispatch':
          case 'dispatch_complete':
          case 'phase_start':
          case 'phase_complete':
          case 'node_start':
          case 'node_complete':
            dispatch({
              type: 'ADD_LOG',
              payload: {
                type: 'dispatch',
                title: event.message || `Event: ${event.event_type}`,
                agentName,
                phase: inferredPhase,
              }
            });
            processedCount++;
            break;

          case 'task_complete':
            dispatch({
              type: 'ADD_LOG',
              payload: { type: 'info', title: event.message || 'Task completed', agentName, phase: 'reporting' }
            });
            processedCount++;
            break;

          case 'task_error':
            dispatch({
              type: 'ADD_LOG',
              payload: { type: 'error', title: event.message || 'Task error', agentName, phase: inferredPhase }
            });
            processedCount++;
            break;

          case 'task_cancel':
            dispatch({
              type: 'ADD_LOG',
              payload: { type: 'info', title: event.message || 'Task cancelled', agentName, phase: inferredPhase }
            });
            processedCount++;
            break;

          case 'progress':
            if (event.message) {
              const progressPatterns: { pattern: RegExp; key: string }[] = [
                { pattern: /索引进度[:：]?\s*\d+\/\d+/, key: 'index_progress' },
                { pattern: /嵌入进度[:：]?\s*\d+\/\d+/, key: 'embed_progress' },
                { pattern: /克隆进度[:：]?\s*\d+%/, key: 'clone_progress' },
                { pattern: /下载进度[:：]?\s*\d+%/, key: 'download_progress' },
                { pattern: /上传进度[:：]?\s*\d+%/, key: 'upload_progress' },
                { pattern: /扫描进度[:：]?\s*\d+/, key: 'scan_progress' },
                { pattern: /分析进度[:：]?\s*\d+/, key: 'analyze_progress' },
              ];
              const matchedProgress = progressPatterns.find(p => p.pattern.test(event.message || ''));
              if (matchedProgress) {
                dispatch({
                  type: 'UPDATE_OR_ADD_PROGRESS_LOG',
                  payload: { progressKey: matchedProgress.key, title: event.message, agentName }
                });
              } else {
                dispatch({
                  type: 'ADD_LOG',
                  payload: { type: 'info', title: event.message, agentName, phase: inferredPhase }
                });
              }
              processedCount++;
            }
            break;

          case 'info':
          case 'complete':
          case 'error':
          case 'warning': {
            const message = event.message || `${event.event_type}`;
            const progressPatterns: { pattern: RegExp; key: string }[] = [
              { pattern: /索引进度[:：]?\s*\d+\/\d+/, key: 'index_progress' },
              { pattern: /嵌入进度[:：]?\s*\d+\/\d+/, key: 'embed_progress' },
              { pattern: /克隆进度[:：]?\s*\d+%/, key: 'clone_progress' },
              { pattern: /下载进度[:：]?\s*\d+%/, key: 'download_progress' },
              { pattern: /上传进度[:：]?\s*\d+%/, key: 'upload_progress' },
              { pattern: /扫描进度[:：]?\s*\d+/, key: 'scan_progress' },
              { pattern: /分析进度[:：]?\s*\d+/, key: 'analyze_progress' },
            ];
            const matchedProgress = progressPatterns.find(p => p.pattern.test(message));
            if (matchedProgress) {
              dispatch({
                type: 'UPDATE_OR_ADD_PROGRESS_LOG',
                payload: { progressKey: matchedProgress.key, title: message, agentName }
              });
            } else {
              dispatch({
                type: 'ADD_LOG',
                payload: {
                  type: event.event_type === 'error' ? 'error' : 'info',
                  title: message,
                  agentName,
                  phase: inferredPhase,
                }
              });
            }
            processedCount++;
            break;
          }

          case 'thinking_token':
          case 'thinking_start':
          case 'thinking_end':
            break;

          default:
            if (event.message) {
              dispatch({
                type: 'ADD_LOG',
                payload: { type: 'info', title: event.message, agentName, phase: inferredPhase }
              });
              processedCount++;
            }
        }
      });

      // 🔥 根据推断的最后阶段更新 currentPhase
      setCurrentPhase(inferredPhase);

      console.log(`[AgentAudit] Processed ${processedCount} events, inferred phase: ${inferredPhase}`);
      setAfterSequence(lastEventSequenceRef.current);
      return events.length;
    } catch (err) {
      console.error('[AgentAudit] Failed to load historical events:', err);
      return 0;
    }
  }, [taskId, dispatch, currentPhase, setCurrentPhase]);

  // ============ Stream Event Handling ============

  const streamOptions = useMemo(() => ({
    includeThinking: true,
    includeToolCalls: true,
    afterSequence: afterSequence,
    onEvent: (event: { type: string; message?: string; metadata?: { agent_name?: string; agent?: string; phase?: string } }) => {
      if (event.metadata?.agent_name) {
        setCurrentAgentName(event.metadata.agent_name);
      }

      // 🔥 推断阶段
      const newPhase = inferPhaseFromEvent(
        event.type,
        event.metadata?.phase || null,
        event.metadata as Record<string, unknown> | null,
        currentPhase
      );
      if (newPhase !== currentPhase) {
        setCurrentPhase(newPhase);
      }

      const dispatchEvents = ['dispatch', 'dispatch_complete', 'node_start', 'phase_start', 'phase_complete'];
      if (dispatchEvents.includes(event.type)) {
        dispatch({
          type: 'ADD_LOG',
          payload: {
            type: 'dispatch',
            title: event.message || `Agent dispatch: ${event.metadata?.agent || 'unknown'}`,
            agentName: getCurrentAgentName() || undefined,
            phase: newPhase,
          }
        });
        debouncedLoadAgentTree();
        return;
      }

      const infoEvents = ['info', 'warning', 'error', 'progress'];
      if (infoEvents.includes(event.type)) {
        const message = event.message || event.type;
        const progressPatterns: { pattern: RegExp; key: string }[] = [
          { pattern: /索引进度[:：]?\s*\d+\/\d+/, key: 'index_progress' },
          { pattern: /嵌入进度[:：]?\s*\d+\/\d+/, key: 'embed_progress' },
          { pattern: /克隆进度[:：]?\s*\d+%/, key: 'clone_progress' },
          { pattern: /下载进度[:：]?\s*\d+%/, key: 'download_progress' },
          { pattern: /上传进度[:：]?\s*\d+%/, key: 'upload_progress' },
          { pattern: /扫描进度[:：]?\s*\d+/, key: 'scan_progress' },
          { pattern: /分析进度[:：]?\s*\d+/, key: 'analyze_progress' },
        ];
        const matchedProgress = progressPatterns.find(p => p.pattern.test(message));
        if (matchedProgress) {
          dispatch({
            type: 'UPDATE_OR_ADD_PROGRESS_LOG',
            payload: { progressKey: matchedProgress.key, title: message, agentName: getCurrentAgentName() || undefined }
          });
        } else {
          dispatch({
            type: 'ADD_LOG',
            payload: {
              type: event.type === 'error' ? 'error' : 'info',
              title: message,
              agentName: getCurrentAgentName() || undefined,
              phase: newPhase,
            }
          });
        }
        return;
      }
    },
    onThinkingStart: () => {
      const currentId = getCurrentThinkingId();
      if (currentId) {
        updateLog(currentId, { isStreaming: false });
      }
      setCurrentThinkingId(null);
    },
    onThinkingToken: (_token: string, accumulated: string) => {
      if (!accumulated?.trim()) return;
      const cleanContent = cleanThinkingContent(accumulated);
      if (!cleanContent) return;

      const currentId = getCurrentThinkingId();
      if (!currentId) {
        const newLogId = `thinking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        dispatch({
          type: 'ADD_LOG', payload: {
            id: newLogId,
            type: 'thinking',
            title: 'Thinking...',
            content: cleanContent,
            isStreaming: true,
            agentName: getCurrentAgentName() || undefined,
            phase: currentPhase,
          }
        });
        setCurrentThinkingId(newLogId);
      } else {
        updateLog(currentId, { content: cleanContent });
      }
    },
    onThinkingEnd: (response: string) => {
      const cleanResponse = cleanThinkingContent(response || "");
      const currentId = getCurrentThinkingId();

      if (!cleanResponse) {
        if (currentId) {
          removeLog(currentId);
        }
        setCurrentThinkingId(null);
        return;
      }

      if (currentId) {
        updateLog(currentId, {
          title: cleanResponse.slice(0, 100) + (cleanResponse.length > 100 ? '...' : ''),
          content: cleanResponse,
          isStreaming: false
        });
        setCurrentThinkingId(null);
      }
    },
    onToolStart: (name: string, input: Record<string, unknown>) => {
      const currentId = getCurrentThinkingId();
      if (currentId) {
        updateLog(currentId, { isStreaming: false });
        setCurrentThinkingId(null);
      }
      dispatch({
        type: 'ADD_LOG',
        payload: {
          type: 'tool',
          title: `Tool: ${name}`,
          content: `Input:\n${JSON.stringify(input, null, 2)}`,
          tool: { name, status: 'running' },
          agentName: getCurrentAgentName() || undefined,
          phase: currentPhase,
        }
      });
    },
    onToolEnd: (name: string, output: unknown, duration: number) => {
      const outputStr = typeof output === 'string' ? output : JSON.stringify(output, null, 2);
      dispatch({
        type: 'COMPLETE_TOOL_LOG',
        payload: { toolName: name, output: truncateOutput(outputStr), duration }
      });
    },
    onFinding: (finding: Record<string, unknown>) => {
      dispatch({
        type: 'ADD_LOG',
        payload: {
          type: 'finding',
          title: (finding.title as string) || 'Vulnerability found',
          severity: (finding.severity as string) || 'medium',
          agentName: getCurrentAgentName() || undefined,
          phase: currentPhase,
        }
      });
      dispatch({
        type: 'ADD_FINDING',
        payload: {
          id: (finding.id as string) || `finding-${Date.now()}`,
          title: (finding.title as string) || 'Vulnerability found',
          severity: (finding.severity as string) || 'medium',
          vulnerability_type: (finding.vulnerability_type as string) || 'unknown',
          file_path: finding.file_path as string,
          line_start: finding.line_start as number,
          description: finding.description as string,
          is_verified: (finding.is_verified as boolean) || false,
        }
      });
    },
    onComplete: () => {
      setCurrentPhase('reporting');
      dispatch({ type: 'ADD_LOG', payload: { type: 'info', title: 'Audit completed successfully', phase: 'reporting' } });
      loadTask();
      loadFindings();
      loadAgentTree();
    },
    onError: (err: string) => {
      dispatch({ type: 'ADD_LOG', payload: { type: 'error', title: `Error: ${err}`, phase: currentPhase } });
    },
  }), [afterSequence, dispatch, loadTask, loadFindings, loadAgentTree, debouncedLoadAgentTree,
    updateLog, removeLog, getCurrentAgentName, getCurrentThinkingId,
    setCurrentAgentName, setCurrentThinkingId, currentPhase, setCurrentPhase]);

  const { connect: connectStream, disconnect: disconnectStream, isConnected } = useAgentStream(taskId || null, streamOptions);

  useEffect(() => {
    disconnectStreamRef.current = disconnectStream;
  }, [disconnectStream]);

  // ============ Effects ============

  // Status animation
  useEffect(() => {
    if (!isRunning) return;
    const dotTimer = setInterval(() => setStatusDots(d => (d + 1) % 4), 500);
    const verbTimer = setInterval(() => {
      setStatusVerb(ACTION_VERBS[Math.floor(Math.random() * ACTION_VERBS.length)]);
    }, 5000);
    return () => {
      clearInterval(dotTimer);
      clearInterval(verbTimer);
    };
  }, [isRunning]);

  // Initial load
  useEffect(() => {
    if (!taskId) {
      setShowSplash(true);
      return;
    }
    setShowSplash(false);
    setLoading(true);
    setHistoricalEventsLoaded(false);

    const loadAllData = async () => {
      try {
        await Promise.all([loadTask(), loadFindings(), loadAgentTree()]);
        const eventsLoaded = await loadHistoricalEvents();
        console.log(`[AgentAudit] Loaded ${eventsLoaded} historical events for task ${taskId}`);
        setHistoricalEventsLoaded(true);
      } catch (error) {
        console.error('[AgentAudit] Failed to load data:', error);
        setHistoricalEventsLoaded(true);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [taskId, loadTask, loadFindings, loadAgentTree, loadHistoricalEvents, setLoading]);

  // Stream connection
  useEffect(() => {
    if (!taskId || !task?.status || task.status !== 'running') return;
    if (!historicalEventsLoaded) return;
    if (hasConnectedRef.current) return;

    hasConnectedRef.current = true;
    console.log(`[AgentAudit] Connecting to stream`);
    connectStream();
    dispatch({ type: 'ADD_LOG', payload: { type: 'info', title: 'Connected to audit stream', phase: currentPhase } });

    return () => {
      console.log('[AgentAudit] Cleanup: disconnecting stream');
      disconnectStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, task?.status, historicalEventsLoaded, connectStream, disconnectStream, dispatch]);

  // Polling
  useEffect(() => {
    if (!taskId || !isRunning) return;
    const interval = setInterval(loadAgentTree, POLLING_INTERVALS.AGENT_TREE);
    return () => clearInterval(interval);
  }, [taskId, isRunning, loadAgentTree]);

  useEffect(() => {
    if (!taskId || !isRunning) return;
    const interval = setInterval(loadTask, POLLING_INTERVALS.TASK_STATS);
    return () => clearInterval(interval);
  }, [taskId, isRunning, loadTask]);

  // ============ Handlers ============

  const handleAgentSelect = useCallback((agentId: string) => {
    if (selectedAgentId === agentId) {
      selectAgent(null);
    } else {
      selectAgent(agentId);
    }
  }, [selectedAgentId, selectAgent]);

  const handleCancel = async () => {
    if (!taskId || isCancelling) return;
    setIsCancelling(true);
    dispatch({ type: 'ADD_LOG', payload: { type: 'info', title: 'Requesting task cancellation...', phase: currentPhase } });

    try {
      await cancelAgentTask(taskId);
      toast.success("Task cancellation requested");
      dispatch({ type: 'ADD_LOG', payload: { type: 'info', title: 'Task cancellation confirmed', phase: currentPhase } });
      await loadTask();
      disconnectStream();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to cancel task: ${errorMessage}`);
      dispatch({ type: 'ADD_LOG', payload: { type: 'error', title: `Failed to cancel: ${errorMessage}`, phase: currentPhase } });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleExportReport = () => {
    if (!task) return;
    setShowExportDialog(true);
  };

  // ============ Render ============

  if (showSplash && !taskId) {
    return (
      <>
        <SplashScreen onComplete={() => setShowCreateDialog(true)} />
        <CreateAgentTaskDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
      </>
    );
  }

  if (isLoading && !task) {
    return (
      <div className="h-screen bg-background flex items-center justify-center font-sans relative">
        <div className="cyber-card p-4">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="loading-spinner" />
              <span className="font-sans text-sm tracking-wide">加载审计任务...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden px-6 pt-1 pb-4 font-sans relative gap-4">

      {/* Header */}
      <Header
        task={task}
        isRunning={isRunning}
        isCancelling={isCancelling}
        onCancel={handleCancel}
      />

      {/* Stats Panel - at top */}
      {task && (
        <StatsPanel task={task} findings={findings} />
      )}

      {/* 🔥 Phase Stepper (vertical) + Agent Tree grid — flex-[9] takes 90% of remaining space (10% height reduction) */}
      {/* Phase Stepper + Agent Tree grid — flex-[4] takes 80% of remaining space (20% height reduction) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Vertical Phase Stepper with live logs */}
        <PhaseStepper
          currentPhase={currentPhase}
          completedPhases={completedPhases}
          isRunning={isRunning}
          isComplete={isComplete}
          phaseLogMap={phaseLogMap}
          expandedPhases={expandedPhases}
          onTogglePhaseExpanded={togglePhaseExpanded}
          currentPhaseLogs={currentPhaseLogs}
          expandedLogIds={expandedLogIds}
          onToggleLogExpanded={toggleLogExpanded}
          isAutoScroll={isAutoScroll}
          onToggleAutoScroll={() => setAutoScroll(!isAutoScroll)}
          scrollRef={phaseScrollRef}
        />

        {/* Right: Agent Tree */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-5 py-4 overflow-hidden flex flex-col min-h-0">
          <div className="section-header !mb-1 !pb-1 !gap-2 !border-b-0">
            <Radio className="w-4 h-4 text-primary" />
            <h3 className="section-title text-sm">
              {selectedAgentId && !showAllLogs ? 'Agent 详情' : 'Agent 概览'}
            </h3>
            {!selectedAgentId && agentTree && (
              <Badge variant="outline" className="ml-2 h-5 px-2 text-xs border-primary/30 text-primary bg-primary/10 font-sans">
                {agentTree.total_agents}
              </Badge>
            )}
            {isConnected && (
              <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/25">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-sans text-primary font-semibold">LIVE</span>
              </div>
            )}
          </div>

          {/* Agent tree content or detail panel */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {selectedAgentId && !showAllLogs ? (
              <AgentDetailPanel
                agentId={selectedAgentId}
                treeNodes={treeNodes}
                onClose={() => selectAgent(null)}
              />
            ) : treeNodes.length > 0 ? (
              <div className="space-y-0.5">
                {treeNodes.map(node => (
                  <AgentTreeNodeItem
                    key={node.agent_id}
                    node={node}
                    selectedId={selectedAgentId}
                    onSelect={handleAgentSelect}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state h-auto py-4">
                {isRunning ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <p className="empty-state-description">初始化 Agent...</p>
                  </>
                ) : (
                  <>
                    <Radio className="empty-state-icon w-8 h-8 text-muted-foreground/50" />
                    <p className="empty-state-description">暂无 Agent</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Back button for agent detail */}
          {selectedAgentId && !showAllLogs && (
            <div className="flex-shrink-0 pt-2 border-t border-border mt-2">
              <button
                onClick={() => selectAgent(null)}
                className="text-xs text-primary hover:text-primary/80 font-sans uppercase px-2 py-1 rounded hover:bg-primary/10"
              >
                返回概览
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create dialog */}
      <CreateAgentTaskDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />

      {/* Export dialog */}
      <ReportExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        task={task}
        findings={findings}
      />
    </div>
  );
}

// Wrapped export with Error Boundary
export default function AgentAuditPage() {
  const { taskId } = useParams<{ taskId: string }>();

  return (
    <AgentErrorBoundary
      taskId={taskId}
      onRetry={() => window.location.reload()}
    >
      <AgentAuditPageContent />
    </AgentErrorBoundary>
  );
}