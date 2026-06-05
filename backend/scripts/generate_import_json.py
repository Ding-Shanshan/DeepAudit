#!/usr/bin/env python3
"""
将批量规则脚本中的 480 条规则转换为 API 导入格式的 JSON 文件。

生成文件：
  - batch_rules_import.json   (24个规则集，共480条规则)
  - import_all.sh             (一键导入脚本)
"""
import json
import re
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# ============================================================
# 第3-6批规则 (来自 add_batch_3_to_6.py)
# ============================================================
BATCH_3_TO_6_RULES = [
    # 第3批
    {
        "name": "批量规则集 - 第3批",
        "description": "批量生成的第3批20条规则",
        "language": "all",
        "rule_type": "security",
        "rules": [
            {"rule_code": "BATCH-021", "name": "缺少安全头 - XSS防护不足", "description": "检测缺少X-Frame-Options等安全头的代码", "category": "security", "severity": "high", "custom_prompt": "检查是否缺少X-Frame-Options、X-XSS-Protection、Content-Security-Policy等安全响应头，这可能导致各种Web攻击。", "fix_suggestion": "添加必要的安全响应头", "enabled": True, "sort_order": 21},
            {"rule_code": "BATCH-022", "name": "不安全的文件上传 - 任意文件上传风险", "description": "检测不安全的文件上传功能", "category": "security", "severity": "critical", "custom_prompt": "检查文件上传功能是否存在安全隐患，如未验证文件类型、大小限制不足等。", "fix_suggestion": "验证文件类型、限制大小、存储在非Web目录", "enabled": True, "sort_order": 22},
            {"rule_code": "BATCH-023", "name": "会话超时设置过长 - 会话劫持风险", "description": "检测会话超时设置过长的代码", "category": "security", "severity": "medium", "custom_prompt": "检查会话超时设置是否过长，这会增加会话劫持的风险。", "fix_suggestion": "设置合理的会话超时时间", "enabled": True, "sort_order": 23},
            {"rule_code": "BATCH-024", "name": "不安全的Cookie属性 - 会话安全问题", "description": "检测Cookie缺少HttpOnly/Secure属性的代码", "category": "security", "severity": "high", "custom_prompt": "检查Cookie是否设置了HttpOnly和Secure属性，缺少这些属性会增加会话劫持风险。", "fix_suggestion": "为敏感Cookie添加HttpOnly和Secure属性", "enabled": True, "sort_order": 24},
            {"rule_code": "BATCH-025", "name": "开放重定向漏洞 - 钓鱼风险", "description": "检测可能导致开放重定向的代码", "category": "security", "severity": "high", "custom_prompt": "检查是否存在开放重定向漏洞，攻击者可利用此进行钓鱼攻击。", "fix_suggestion": "验证并限制重定向URL", "enabled": True, "sort_order": 25},
            {"rule_code": "BATCH-026", "name": "缺少CSRF保护 - 跨站请求伪造", "description": "检测缺少CSRF保护的代码", "category": "security", "severity": "critical", "custom_prompt": "检查是否缺少CSRF保护机制，这可能导致跨站请求伪造攻击。", "fix_suggestion": "添加CSRF token保护", "enabled": True, "sort_order": 26},
            {"rule_code": "BATCH-027", "name": "硬编码的凭证 - 安全风险", "description": "检测代码中硬编码的密码或凭证", "category": "security", "severity": "critical", "custom_prompt": "检查是否在代码中硬编码了密码、API密钥等敏感凭证信息。", "fix_suggestion": "将凭证移到环境变量或密钥管理系统", "enabled": True, "sort_order": 27},
            {"rule_code": "BATCH-028", "name": "不安全的密码存储 - 明文或弱哈希", "description": "检测不安全的密码存储方式", "category": "security", "severity": "critical", "custom_prompt": "检查密码是否以明文或弱哈希方式存储，这会导致密码泄露风险。", "fix_suggestion": "使用bcrypt/Argon2等强哈希算法", "enabled": True, "sort_order": 28},
            {"rule_code": "BATCH-029", "name": "缺少密码策略 - 弱密码风险", "description": "检测缺少密码策略的代码", "category": "security", "severity": "medium", "custom_prompt": "检查是否缺少密码复杂度要求策略，这会导致用户设置弱密码。", "fix_suggestion": "实施密码复杂度要求", "enabled": True, "sort_order": 29},
            {"rule_code": "BATCH-030", "name": "信息泄露 - 详细错误信息", "description": "检测泄露敏感信息的错误消息", "category": "security", "severity": "medium", "custom_prompt": "检查是否在错误消息中泄露了堆栈跟踪、数据库结构等敏感信息。", "fix_suggestion": "生产环境中隐藏详细错误信息", "enabled": True, "sort_order": 30},
            {"rule_code": "BATCH-031", "name": "不安全的依赖 - 已知漏洞", "description": "检测使用已知漏洞版本的依赖", "category": "security", "severity": "high", "custom_prompt": "检查项目依赖是否存在已知安全漏洞的版本。", "fix_suggestion": "升级到安全的依赖版本", "enabled": True, "sort_order": 31},
            {"rule_code": "BATCH-032", "name": "缺少请求大小限制 - DoS风险", "description": "检测缺少请求大小限制的代码", "category": "security", "severity": "medium", "custom_prompt": "检查是否缺少请求体大小限制，这可能导致DoS攻击。", "fix_suggestion": "设置合理的请求大小限制", "enabled": True, "sort_order": 32},
            {"rule_code": "BATCH-033", "name": "不安全的XML解析 - XXE风险", "description": "检测不安全的XML解析代码", "category": "security", "severity": "critical", "custom_prompt": "检查XML解析是否禁用了外部实体引用，防止XXE攻击。", "fix_suggestion": "禁用XML外部实体引用", "enabled": True, "sort_order": 33},
            {"rule_code": "BATCH-034", "name": "目录列表暴露 - 信息泄露", "description": "检测目录列表功能启用的代码", "category": "security", "severity": "low", "custom_prompt": "检查是否启用了目录列表功能，这可能泄露敏感文件信息。", "fix_suggestion": "禁用目录列表功能", "enabled": True, "sort_order": 34},
            {"rule_code": "BATCH-035", "name": "不安全的跳转 - 未验证目标", "description": "检测未验证目标的跳转代码", "category": "security", "severity": "high", "custom_prompt": "检查跳转功能是否验证目标URL，防止跳转攻击。", "fix_suggestion": "使用白名单验证跳转目标", "enabled": True, "sort_order": 35},
            {"rule_code": "BATCH-036", "name": "缺少审计日志 - 安全事件追踪", "description": "检测关键操作缺少审计日志的代码", "category": "security", "severity": "medium", "custom_prompt": "检查关键安全操作是否缺少审计日志记录。", "fix_suggestion": "为关键操作添加审计日志", "enabled": True, "sort_order": 36},
            {"rule_code": "BATCH-037", "name": "不安全的临时文件 - 竞争条件", "description": "检测不安全的临时文件操作", "category": "security", "severity": "medium", "custom_prompt": "检查临时文件操作是否存在竞争条件风险。", "fix_suggestion": "使用安全的临时文件创建方式", "enabled": True, "sort_order": 37},
            {"rule_code": "BATCH-038", "name": "硬编码的加密密钥 - 密钥管理", "description": "检测硬编码的加密密钥", "category": "security", "severity": "critical", "custom_prompt": "检查是否在代码中硬编码了加密密钥。", "fix_suggestion": "使用安全的密钥管理系统", "enabled": True, "sort_order": 38},
            {"rule_code": "BATCH-039", "name": "缺少访问控制 - 垂直越权", "description": "检测缺少垂直权限控制的代码", "category": "security", "severity": "critical", "custom_prompt": "检查是否缺少基于角色的访问控制，可能导致垂直越权。", "fix_suggestion": "实现基于角色的访问控制", "enabled": True, "sort_order": 39},
            {"rule_code": "BATCH-040", "name": "不安全的缓存策略 - 敏感数据", "description": "检测敏感数据缓存不当的代码", "category": "security", "severity": "medium", "custom_prompt": "检查敏感数据是否被不安全地缓存。", "fix_suggestion": "避免缓存敏感数据或加密缓存", "enabled": True, "sort_order": 40},
        ],
    },
    # 第4批
    {
        "name": "批量规则集 - 第4批",
        "description": "批量生成的第4批20条规则",
        "language": "all",
        "rule_type": "security",
        "rules": [
            {"rule_code": "BATCH-041", "name": "不安全的字符编码 - 编码问题", "description": "检测字符编码处理不安全的代码", "category": "security", "severity": "medium", "custom_prompt": "检查字符编码处理是否安全，防止编码注入攻击。", "fix_suggestion": "统一使用UTF-8编码，正确处理多字节字符", "enabled": True, "sort_order": 41},
            {"rule_code": "BATCH-042", "name": "缺少资源释放 - 资源泄露", "description": "检测未正确释放资源的代码", "category": "quality", "severity": "medium", "custom_prompt": "检查文件句柄、数据库连接等资源是否被正确释放。", "fix_suggestion": "使用try-finally或with语句确保资源释放", "enabled": True, "sort_order": 42},
            {"rule_code": "BATCH-043", "name": "不安全的竞争条件 - 并发问题", "description": "检测存在竞争条件的代码", "category": "security", "severity": "medium", "custom_prompt": "检查并发操作是否存在竞争条件风险。", "fix_suggestion": "使用适当的同步机制", "enabled": True, "sort_order": 43},
            {"rule_code": "BATCH-044", "name": "硬编码的秘密 - 配置管理", "description": "检测硬编码在代码中的各种秘密", "category": "security", "severity": "critical", "custom_prompt": "检查是否在代码中硬编码了任何类型的秘密信息。", "fix_suggestion": "使用配置管理和密钥管理系统", "enabled": True, "sort_order": 44},
            {"rule_code": "BATCH-045", "name": "缺少速率限制 - API保护", "description": "检测API接口缺少速率限制的代码", "category": "security", "severity": "high", "custom_prompt": "检查API接口是否缺少速率限制，防止暴力攻击。", "fix_suggestion": "为API接口添加速率限制", "enabled": True, "sort_order": 45},
            {"rule_code": "BATCH-046", "name": "不安全的版本控制 - 秘密泄露", "description": "检测版本控制中可能泄露的秘密", "category": "security", "severity": "high", "custom_prompt": "检查是否有敏感文件被提交到版本控制系统。", "fix_suggestion": "使用.gitignore忽略敏感文件", "enabled": True, "sort_order": 46},
            {"rule_code": "BATCH-047", "name": "缺少输入验证 - 数据格式", "description": "检测缺少输入格式验证的代码", "category": "security", "severity": "high", "custom_prompt": "检查用户输入是否验证了数据格式和类型。", "fix_suggestion": "使用白名单验证输入格式", "enabled": True, "sort_order": 47},
            {"rule_code": "BATCH-048", "name": "不安全的密码重置 - 账户接管", "description": "检测不安全的密码重置功能", "category": "security", "severity": "critical", "custom_prompt": "检查密码重置功能是否存在安全漏洞。", "fix_suggestion": "使用安全的密码重置流程", "enabled": True, "sort_order": 48},
            {"rule_code": "BATCH-049", "name": "缺少会话固定保护 - 会话安全", "description": "检测缺少会话固定保护的代码", "category": "security", "severity": "high", "custom_prompt": "检查是否在登录后重新生成会话ID。", "fix_suggestion": "登录后重新生成会话ID", "enabled": True, "sort_order": 49},
            {"rule_code": "BATCH-050", "name": "不安全的API认证 - 身份验证", "description": "检测API认证实现不安全的代码", "category": "security", "severity": "critical", "custom_prompt": "检查API认证机制是否安全实现。", "fix_suggestion": "使用标准的认证方案如JWT、OAuth2", "enabled": True, "sort_order": 50},
            {"rule_code": "BATCH-051", "name": "缺少MFA支持 - 认证强化", "description": "检测缺少多因素认证的代码", "category": "security", "severity": "medium", "custom_prompt": "检查是否支持多因素认证来增强账户安全。", "fix_suggestion": "考虑实现多因素认证支持", "enabled": True, "sort_order": 51},
            {"rule_code": "BATCH-052", "name": "不安全的会话管理 - 会话存储", "description": "检测会话管理不安全的代码", "category": "security", "severity": "high", "custom_prompt": "检查会话数据是否安全存储。", "fix_suggestion": "将会话数据存储在服务端", "enabled": True, "sort_order": 52},
            {"rule_code": "BATCH-053", "name": "缺少数据加密 - 传输安全", "description": "检测传输数据未加密的代码", "category": "security", "severity": "critical", "custom_prompt": "检查敏感数据传输是否加密。", "fix_suggestion": "使用TLS/SSL加密数据传输", "enabled": True, "sort_order": 53},
            {"rule_code": "BATCH-054", "name": "不安全的密钥派生 - 密码学", "description": "检测密钥派生不安全的代码", "category": "security", "severity": "critical", "custom_prompt": "检查密钥派生是否使用了安全的算法。", "fix_suggestion": "使用PBKDF2、scrypt或Argon2", "enabled": True, "sort_order": 54},
            {"rule_code": "BATCH-055", "name": "缺少签名验证 - 数据完整性", "description": "检测缺少数据签名验证的代码", "category": "security", "severity": "high", "custom_prompt": "检查关键数据是否有签名验证保证完整性。", "fix_suggestion": "对关键数据进行数字签名", "enabled": True, "sort_order": 55},
            {"rule_code": "BATCH-056", "name": "不安全的反射 - 代码注入", "description": "检测不安全使用反射的代码", "category": "security", "severity": "critical", "custom_prompt": "检查反射功能是否被安全使用。", "fix_suggestion": "避免对用户输入使用反射", "enabled": True, "sort_order": 56},
            {"rule_code": "BATCH-057", "name": "缺少备份策略 - 数据安全", "description": "检测缺少数据备份策略的代码", "category": "quality", "severity": "medium", "custom_prompt": "检查是否有适当的数据备份策略。", "fix_suggestion": "实施定期的数据备份策略", "enabled": True, "sort_order": 57},
            {"rule_code": "BATCH-058", "name": "不安全的API设计 - REST安全", "description": "检测API设计不安全的代码", "category": "security", "severity": "medium", "custom_prompt": "检查REST API设计是否遵循安全最佳实践。", "fix_suggestion": "遵循REST安全最佳实践", "enabled": True, "sort_order": 58},
            {"rule_code": "BATCH-059", "name": "缺少异常处理 - 错误安全", "description": "检测异常处理不当的代码", "category": "quality", "severity": "medium", "custom_prompt": "检查异常处理是否泄露敏感信息。", "fix_suggestion": "安全地处理异常，不泄露详情", "enabled": True, "sort_order": 59},
            {"rule_code": "BATCH-060", "name": "不安全的第三方集成 - 供应链安全", "description": "检测第三方集成不安全的代码", "category": "security", "severity": "high", "custom_prompt": "检查第三方库和服务的集成是否安全。", "fix_suggestion": "审查和验证第三方依赖", "enabled": True, "sort_order": 60},
        ],
    },
    # 第5批
    {
        "name": "批量规则集 - 第5批",
        "description": "批量生成的第5批20条规则",
        "language": "all",
        "rule_type": "security",
        "rules": [
            {"rule_code": "BATCH-061", "name": "不安全的本地存储 - 客户端安全", "description": "检测浏览器本地存储使用不当的代码", "category": "security", "severity": "medium", "custom_prompt": "检查敏感数据是否被不安全地存储在客户端。", "fix_suggestion": "避免在本地存储敏感数据", "enabled": True, "sort_order": 61},
            {"rule_code": "BATCH-062", "name": "缺少内容安全策略 - CSP", "description": "检测缺少内容安全策略的代码", "category": "security", "severity": "high", "custom_prompt": "检查是否实现了内容安全策略(CSP)来防止XSS。", "fix_suggestion": "实现内容安全策略", "enabled": True, "sort_order": 62},
            {"rule_code": "BATCH-063", "name": "不安全的Web Workers - 线程安全", "description": "检测Web Workers使用不当的代码", "category": "security", "severity": "low", "custom_prompt": "检查Web Workers的使用是否安全。", "fix_suggestion": "验证传递给Web Workers的数据", "enabled": True, "sort_order": 63},
            {"rule_code": "BATCH-064", "name": "缺少子资源完整性 - SRI", "description": "检测缺少子资源完整性验证的代码", "category": "security", "severity": "medium", "custom_prompt": "检查第三方资源是否有完整性验证。", "fix_suggestion": "使用SRI验证第三方资源", "enabled": True, "sort_order": 64},
            {"rule_code": "BATCH-065", "name": "不安全的WebSocket - 通信安全", "description": "检测WebSocket使用不安全的代码", "category": "security", "severity": "medium", "custom_prompt": "检查WebSocket连接是否安全。", "fix_suggestion": "使用wss://协议，验证消息来源", "enabled": True, "sort_order": 65},
            {"rule_code": "BATCH-066", "name": "缺少权限最小化 - 权限过宽", "description": "检测权限设置过宽的代码", "category": "security", "severity": "medium", "custom_prompt": "检查应用权限是否遵循最小权限原则。", "fix_suggestion": "遵循最小权限原则", "enabled": True, "sort_order": 66},
            {"rule_code": "BATCH-067", "name": "不安全的定时任务 - 任务安全", "description": "检测定时任务实现不安全的代码", "category": "security", "severity": "medium", "custom_prompt": "检查定时任务是否存在安全隐患。", "fix_suggestion": "安全地实现定时任务", "enabled": True, "sort_order": 67},
            {"rule_code": "BATCH-068", "name": "缺少日志监控 - 安全监控", "description": "检测缺少日志监控的代码", "category": "security", "severity": "medium", "custom_prompt": "检查是否有安全日志监控机制。", "fix_suggestion": "实施安全日志监控", "enabled": True, "sort_order": 68},
            {"rule_code": "BATCH-069", "name": "不安全的消息队列 - 中间件安全", "description": "检测消息队列使用不安全的代码", "category": "security", "severity": "medium", "custom_prompt": "检查消息队列是否安全配置和使用。", "fix_suggestion": "安全配置消息队列", "enabled": True, "sort_order": 69},
            {"rule_code": "BATCH-070", "name": "缺少网络分段 - 网络安全", "description": "检测网络架构缺少分段的代码", "category": "security", "severity": "low", "custom_prompt": "检查系统是否考虑了网络分段。", "fix_suggestion": "考虑实施网络分段", "enabled": True, "sort_order": 70},
            {"rule_code": "BATCH-071", "name": "不安全的数据库权限 - 数据库安全", "description": "检测数据库权限设置不当的代码", "category": "security", "severity": "critical", "custom_prompt": "检查数据库用户权限是否设置合理。", "fix_suggestion": "遵循数据库最小权限原则", "enabled": True, "sort_order": 71},
            {"rule_code": "BATCH-072", "name": "缺少数据分类 - 数据治理", "description": "检测缺少数据分类的代码", "category": "quality", "severity": "low", "custom_prompt": "检查是否对数据进行了安全分类。", "fix_suggestion": "实施数据分类策略", "enabled": True, "sort_order": 72},
            {"rule_code": "BATCH-073", "name": "不安全的配置文件 - 配置安全", "description": "检测配置文件处理不当的代码", "category": "security", "severity": "high", "custom_prompt": "检查配置文件是否安全存储和访问。", "fix_suggestion": "安全地管理配置文件", "enabled": True, "sort_order": 73},
            {"rule_code": "BATCH-074", "name": "缺少安全编码规范 - 开发流程", "description": "检测缺少安全编码规范的项目", "category": "quality", "severity": "low", "custom_prompt": "检查项目是否有安全编码规范。", "fix_suggestion": "建立安全编码规范", "enabled": True, "sort_order": 74},
            {"rule_code": "BATCH-075", "name": "不安全的文件权限 - 文件系统安全", "description": "检测文件权限设置不当的代码", "category": "security", "severity": "medium", "custom_prompt": "检查文件和目录权限是否设置安全。", "fix_suggestion": "设置最小必要的文件权限", "enabled": True, "sort_order": 75},
            {"rule_code": "BATCH-076", "name": "缺少变更管理 - 变更安全", "description": "检测缺少变更管理流程的代码", "category": "quality", "severity": "low", "custom_prompt": "检查是否有安全的变更管理流程。", "fix_suggestion": "实施变更管理流程", "enabled": True, "sort_order": 76},
            {"rule_code": "BATCH-077", "name": "不安全的Shell命令 - 命令注入", "description": "检测Shell命令拼接的代码", "category": "security", "severity": "critical", "custom_prompt": "检查是否存在Shell命令拼接导致的注入风险。", "fix_suggestion": "避免Shell拼接，使用安全的API", "enabled": True, "sort_order": 77},
            {"rule_code": "BATCH-078", "name": "缺少威胁建模 - 设计安全", "description": "检测缺少威胁建模的项目", "category": "quality", "severity": "low", "custom_prompt": "检查项目是否进行了威胁建模。", "fix_suggestion": "考虑进行威胁建模", "enabled": True, "sort_order": 78},
            {"rule_code": "BATCH-079", "name": "不安全的反病毒绕过 - 恶意软件", "description": "检测可能被用于反病毒绕过的代码", "category": "security", "severity": "medium", "custom_prompt": "检查代码是否包含可疑的反病毒绕过特征。", "fix_suggestion": "避免使用可疑的技术", "enabled": True, "sort_order": 79},
            {"rule_code": "BATCH-080", "name": "缺少安全测试 - 测试覆盖", "description": "检测缺少安全测试的项目", "category": "quality", "severity": "medium", "custom_prompt": "检查项目是否有安全测试流程。", "fix_suggestion": "实施安全测试流程", "enabled": True, "sort_order": 80},
        ],
    },
    # 第6批
    {
        "name": "批量规则集 - 第6批",
        "description": "批量生成的第6批20条规则",
        "language": "all",
        "rule_type": "security",
        "rules": [
            {"rule_code": "BATCH-081", "name": "不安全的序列化 - 反序列化漏洞", "description": "检测不安全的序列化实现", "category": "security", "severity": "critical", "custom_prompt": "检查序列化/反序列化是否安全实现。", "fix_suggestion": "避免不安全的反序列化", "enabled": True, "sort_order": 81},
            {"rule_code": "BATCH-082", "name": "缺少输入限制 - 长度检查", "description": "检测缺少输入长度限制的代码", "category": "security", "severity": "medium", "custom_prompt": "检查用户输入是否有长度限制。", "fix_suggestion": "设置合理的输入长度限制", "enabled": True, "sort_order": 82},
            {"rule_code": "BATCH-083", "name": "不安全的随机数 - 密码学随机", "description": "检测非加密安全随机数的使用", "category": "security", "severity": "high", "custom_prompt": "检查安全场景下是否使用了安全的随机数生成器。", "fix_suggestion": "使用加密安全的随机数生成器", "enabled": True, "sort_order": 83},
            {"rule_code": "BATCH-084", "name": "缺少补丁管理 - 系统更新", "description": "检测缺少补丁管理的代码", "category": "quality", "severity": "medium", "custom_prompt": "检查系统是否有补丁管理策略。", "fix_suggestion": "建立补丁管理策略", "enabled": True, "sort_order": 84},
            {"rule_code": "BATCH-085", "name": "不安全的凭据存储 - 密码管理", "description": "检测凭据存储不安全的代码", "category": "security", "severity": "critical", "custom_prompt": "检查凭据是否安全存储。", "fix_suggestion": "使用安全的凭据存储方案", "enabled": True, "sort_order": 85},
            {"rule_code": "BATCH-086", "name": "缺少密钥轮换 - 密钥管理", "description": "检测缺少密钥轮换策略的代码", "category": "security", "severity": "medium", "custom_prompt": "检查加密密钥是否有轮换机制。", "fix_suggestion": "实施密钥轮换策略", "enabled": True, "sort_order": 86},
            {"rule_code": "BATCH-087", "name": "不安全的API限流 - 防刷机制", "description": "检测API限流实现不安全的代码", "category": "security", "severity": "medium", "custom_prompt": "检查API限流是否有效实现。", "fix_suggestion": "安全实现API限流", "enabled": True, "sort_order": 87},
            {"rule_code": "BATCH-088", "name": "缺少数据脱敏 - 隐私保护", "description": "检测敏感数据未脱敏的代码", "category": "security", "severity": "medium", "custom_prompt": "检查敏感数据在日志等地方是否脱敏。", "fix_suggestion": "对敏感数据进行脱敏处理", "enabled": True, "sort_order": 88},
            {"rule_code": "BATCH-089", "name": "不安全的重定向 - 开放重定向", "description": "检测重定向目标未验证的代码", "category": "security", "severity": "high", "custom_prompt": "检查重定向功能是否安全。", "fix_suggestion": "验证重定向目标", "enabled": True, "sort_order": 89},
            {"rule_code": "BATCH-090", "name": "缺少错误处理 - 异常安全", "description": "检测错误处理不当的代码", "category": "quality", "severity": "medium", "custom_prompt": "检查错误处理是否安全。", "fix_suggestion": "安全地处理错误", "enabled": True, "sort_order": 90},
            {"rule_code": "BATCH-091", "name": "不安全的跨站请求 - CSRF", "description": "检测CSRF防护不足的代码", "category": "security", "severity": "critical", "custom_prompt": "检查CSRF防护是否充分。", "fix_suggestion": "实施CSRF防护", "enabled": True, "sort_order": 91},
            {"rule_code": "BATCH-092", "name": "缺少会话过期 - 会话管理", "description": "检测会话过期设置不当的代码", "category": "security", "severity": "medium", "custom_prompt": "检查会话过期是否合理设置。", "fix_suggestion": "设置合理的会话过期时间", "enabled": True, "sort_order": 92},
            {"rule_code": "BATCH-093", "name": "不安全的文件包含 - LFI/RFI", "description": "检测文件包含漏洞的代码", "category": "security", "severity": "critical", "custom_prompt": "检查是否存在本地或远程文件包含漏洞。", "fix_suggestion": "避免动态文件包含", "enabled": True, "sort_order": 93},
            {"rule_code": "BATCH-094", "name": "缺少权限继承 - 访问控制", "description": "检测权限继承设计不当的代码", "category": "security", "severity": "medium", "custom_prompt": "检查权限继承逻辑是否安全。", "fix_suggestion": "安全设计权限继承", "enabled": True, "sort_order": 94},
            {"rule_code": "BATCH-095", "name": "不安全的类型转换 - 类型安全", "description": "检测类型转换不安全的代码", "category": "quality", "severity": "medium", "custom_prompt": "检查类型转换是否安全处理。", "fix_suggestion": "安全地处理类型转换", "enabled": True, "sort_order": 95},
            {"rule_code": "BATCH-096", "name": "缺少资源限制 - 资源控制", "description": "检测缺少资源使用限制的代码", "category": "security", "severity": "medium", "custom_prompt": "检查是否有资源使用限制。", "fix_suggestion": "设置资源使用限制", "enabled": True, "sort_order": 96},
            {"rule_code": "BATCH-097", "name": "不安全的变量覆盖 - 代码注入", "description": "检测可能导致变量覆盖的代码", "category": "security", "severity": "high", "custom_prompt": "检查是否存在变量覆盖漏洞。", "fix_suggestion": "避免动态变量名", "enabled": True, "sort_order": 97},
            {"rule_code": "BATCH-098", "name": "缺少验证逻辑 - 业务逻辑", "description": "检测业务逻辑验证不足的代码", "category": "security", "severity": "medium", "custom_prompt": "检查业务逻辑验证是否充分。", "fix_suggestion": "充分验证业务逻辑", "enabled": True, "sort_order": 98},
            {"rule_code": "BATCH-099", "name": "不安全的时间检查 - 竞争条件", "description": "检测时间检查不安全的代码", "category": "security", "severity": "medium", "custom_prompt": "检查时间相关的检查是否存在竞争条件。", "fix_suggestion": "避免TOCTOU竞争条件", "enabled": True, "sort_order": 99},
            {"rule_code": "BATCH-100", "name": "缺少安全文档 - 文档完整性", "description": "检测缺少安全文档的项目", "category": "quality", "severity": "low", "custom_prompt": "检查项目是否有安全相关文档。", "fix_suggestion": "编写安全文档", "enabled": True, "sort_order": 100},
        ],
    },
]


# ============================================================
# 第7-26批规则 (解析 add_batches_7_to_26.sql)
# ============================================================
def parse_sql_batches(sql_path):
    """从 SQL 文件中解析出规则集和规则 - 逐行解析"""
    with open(sql_path, "r", encoding="utf-8") as f:
        content = f.read()

    rule_sets = []
    current_rule_set = None
    current_rules = []

    # 匹配批次标题行，提取批次号
    batch_header_re = re.compile(r"第(\d+)批\s*\(BATCH-\d+")
    # 匹配规则集名称行
    rule_set_name_re = re.compile(r"'(批量规则集 - 第\d+批)'")
    # 匹配规则集描述行
    rule_set_desc_re = re.compile(r"'(批量生成的第\d+批20条规则)'")
    # 匹配 rule_type 行 (在 name/desc 之后)
    rule_type_re = re.compile(r"'all',\s*'(\w+)',")

    # 匹配规则行: SELECT/UNION ALL SELECT ..., 'BATCH-xxx', 'name', 'desc', 'category', 'severity', 'prompt', 'fix', ...
    rule_line_re = re.compile(
        r"""(?:UNION\s+ALL\s+)?SELECT\s+gen_random_uuid\(\),\s*id,\s*"""
        r"""'(BATCH-\d+)',\s*"""          # rule_code
        r"""'([^']*)',\s*"""              # name
        r"""'([^']*)',\s*"""              # description
        r"""'(security|quality|performance)',\s*"""  # category
        r"""'(critical|high|medium|low)',\s*"""       # severity
        r"""'([^']*)',\s*"""              # custom_prompt
        r"""'([^']*)'""",                 # fix_suggestion
    )

    lines = content.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]

        # 检测批次标题注释行
        header_m = batch_header_re.search(line)
        if header_m:
            # 保存上一个规则集
            if current_rule_set and current_rules:
                current_rule_set["rules"] = current_rules
                rule_sets.append(current_rule_set)
            current_rule_set = None
            current_rules = []

            # 向后扫描找规则集名和类型
            batch_num = header_m.group(1)
            name = None
            desc = None
            rule_type = "security"
            for j in range(i, min(i + 20, len(lines))):
                if not name:
                    nm = rule_set_name_re.search(lines[j])
                    if nm:
                        name = nm.group(1)
                if not desc:
                    dm = rule_set_desc_re.search(lines[j])
                    if dm:
                        desc = dm.group(1)
                rt = rule_type_re.search(lines[j])
                if rt:
                    rule_type = rt.group(1)

            if name:
                current_rule_set = {
                    "name": name,
                    "description": desc or "",
                    "language": "all",
                    "rule_type": rule_type,
                }
            i += 1
            continue

        # 尝试匹配规则行
        rule_m = rule_line_re.search(line)
        if rule_m and current_rule_set:
            rule_code = rule_m.group(1)
            name = rule_m.group(2)
            description = rule_m.group(3)
            category = rule_m.group(4)
            severity = rule_m.group(5)
            custom_prompt = rule_m.group(6)
            fix_suggestion = rule_m.group(7)
            sort_order = int(rule_code.split("-")[-1])

            current_rules.append({
                "rule_code": rule_code,
                "name": name,
                "description": description,
                "category": category,
                "severity": severity,
                "custom_prompt": custom_prompt,
                "fix_suggestion": fix_suggestion,
                "enabled": True,
                "sort_order": sort_order,
            })

        i += 1

    # 保存最后一个规则集
    if current_rule_set and current_rules:
        current_rule_set["rules"] = current_rules
        rule_sets.append(current_rule_set)

    return rule_sets


def main():
    # 解析第7-26批
    sql_path = os.path.join(SCRIPT_DIR, "add_batches_7_to_26.sql")
    batch_7_to_26 = parse_sql_batches(sql_path)

    # 合并所有批次
    all_rule_sets = BATCH_3_TO_6_RULES + batch_7_to_26

    # 统计
    total_rules = sum(len(rs["rules"]) for rs in all_rule_sets)
    print(f"✅ 共解析 {len(all_rule_sets)} 个规则集，{total_rules} 条规则")

    # 生成单个大 JSON 文件（包含所有规则集的数组）
    output_path = os.path.join(SCRIPT_DIR, "batch_rules_import.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_rule_sets, f, ensure_ascii=False, indent=2)
    print(f"📄 已生成: {output_path}")

    # 同时为每个规则集生成单独的 JSON 文件（方便逐个导入）
    individual_dir = os.path.join(SCRIPT_DIR, "batch_rules_individual")
    os.makedirs(individual_dir, exist_ok=True)
    for rs in all_rule_sets:
        # 从名称提取批次号
        batch_num_match = re.search(r"第(\d+)批", rs["name"])
        batch_num = batch_num_match.group(1) if batch_num_match else "unknown"
        filename = f"batch_{batch_num}.json"
        filepath = os.path.join(individual_dir, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(rs, f, ensure_ascii=False, indent=2)

    print(f"📁 已生成 {len(all_rule_sets)} 个独立文件到: {individual_dir}/")

    # 生成一键导入脚本
    generate_import_script(all_rule_sets, individual_dir)


def generate_import_script(rule_sets, individual_dir):
    """生成一键导入的 shell 脚本"""
    script_path = os.path.join(SCRIPT_DIR, "import_all.sh")

    lines = [
        "#!/bin/bash",
        "#",
        "# DeepAudit 批量规则导入脚本",
        "# 使用方法：",
        "#   1. 确保 DeepAudit 后端已启动",
        "#   2. 设置 token:  export DEEPAUDIT_TOKEN=你的登录token",
        "#   3. chmod +x import_all.sh && ./import_all.sh",
        "#",
        "# 也可用前端界面导入：打开 审计规则 页面 → 导入规则 → 粘贴 batch_rules_individual/ 下的 JSON 内容",
        "#",
        "SCRIPT_DIR=\"$(cd \"$(dirname \"$0\")\" && pwd)\"",
        "BASE_URL=\"${DEEPAUDIT_API_URL:-http://localhost:8000}\"",
        "TOKEN=\"${DEEPAUDIT_TOKEN:-}\"",
        "",
        "if [ -z \"$TOKEN\" ]; then",
        "    echo \"❌ 请设置 DEEPAUDIT_TOKEN 环境变量，或在脚本中修改 TOKEN\"",
        "    echo \"   获取方式：登录 DeepAudit 后，从浏览器开发者工具中复制 Authorization header 中的 token\"",
        "    echo \"   示例: export DEEPAUDIT_TOKEN=eyJ...\"",
        "    exit 1",
        "fi",
        "",
        "echo \"🎯 目标服务: $BASE_URL\"",
        "echo \"📦 开始导入 24 个规则集 (共480条规则)...\"",
        "echo \"\"",
        "",
        "SUCCESS=0",
        "FAIL=0",
        "",
    ]

    for rs in rule_sets:
        batch_num_match = re.search(r"第(\d+)批", rs["name"])
        batch_num = batch_num_match.group(1) if batch_num_match else "unknown"
        filename = f"batch_{batch_num}.json"
        rule_count = len(rs["rules"])

        lines.append(f"# 第{batch_num}批 ({rule_count}条规则)")
        lines.append(f"echo \"📥 导入: {rs['name']} ({rule_count}条)...\"")
        lines.append(f"RESP=$(curl -s -w \"\\n%{{http_code}}\" -X POST \\")
        lines.append(f"  \"$BASE_URL/api/v1/rules/import\" \\")
        lines.append(f"  -H \"Content-Type: application/json\" \\")
        lines.append(f"  -H \"Authorization: Bearer $TOKEN\" \\")
        lines.append(f"  -d @\"$SCRIPT_DIR/batch_rules_individual/{filename}\")")
        lines.append(f"HTTP_CODE=$(echo \"$RESP\" | tail -1)")
        lines.append(f"if [ \"$HTTP_CODE\" = \"200\" ] || [ \"$HTTP_CODE\" = \"201\" ]; then")
        lines.append(f"    echo \"  ✅ 成功\"")
        lines.append(f"    SUCCESS=$((SUCCESS + 1))")
        lines.append(f"else")
        lines.append(f"    echo \"  ❌ 失败 (HTTP $HTTP_CODE)\"")
        lines.append(f"    FAIL=$((FAIL + 1))")
        lines.append(f"fi")
        lines.append("")

    lines.append("echo \"\"")
    lines.append("echo \"========================================\"")
    lines.append("echo \"🎉 导入完成！成功: $SUCCESS, 失败: $FAIL\"")
    lines.append("echo \"========================================\"")

    with open(script_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    os.chmod(script_path, 0o755)
    print(f"🔧 已生成一键导入脚本: {script_path}")


if __name__ == "__main__":
    main()
