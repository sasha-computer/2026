# Gandalf Security Model

## Trust Model

| Entity | Trust Level | Rationale |
|--------|-------------|-----------|
| Main group | Trusted | Private admin control channel |
| Non-main groups | Untrusted | Other users may be malicious |
| Agent subprocess | Scoped | Runs with constrained working directory |
| User messages | Untrusted | Potential prompt injection |

## Security Boundaries

### 1. Process and Directory Scoping

Agents run as native subprocesses with a group-specific working directory. The host process controls what data is provided and how IPC messages are handled.

### 2. Path Allowlist

**External Allowlist** - Path permissions stored at `~/.config/gandalf/mount-allowlist.json`, which is:
- Outside project root
- Maintained by the operator
- Used by the host to validate path access

**Default Blocked Patterns:**
```
.ssh, .gnupg, .aws, .azure, .gcloud, .kube,
credentials, .env, .netrc, .npmrc, id_rsa, id_ed25519,
private_key, .secret
```

**Protections:**
- Symlink resolution before validation (prevents traversal attacks)
- Path validation (rejects `..` and absolute path escapes)
- `nonMainReadOnly` option forces read-only for non-main groups

### 3. Session Isolation

Each group has isolated Claude sessions at `data/sessions/{group}/.claude/`:
- Groups cannot see other groups' conversation history
- Session data includes full message history and file contents read
- Prevents cross-group information disclosure

### 4. IPC Authorization

Messages and task operations are verified against group identity:

| Operation | Main Group | Non-Main Group |
|-----------|------------|----------------|
| Send message to own chat | ✓ | ✓ |
| Send message to other chats | ✓ | ✗ |
| Schedule task for self | ✓ | ✓ |
| Schedule task for others | ✓ | ✗ |
| View all tasks | ✓ | Own only |
| Manage other groups | ✓ | ✗ |

### 5. Credential Handling

Credentials are read from `.env` by the host process and passed to the agent subprocess. Keep the `.env` file minimal and avoid storing unrelated secrets.

> **Note:** Claude authentication credentials are required for the agent to operate. If tighter credential isolation is needed, prefer running Gandalf on a dedicated machine or account with minimal access.

## Privilege Comparison

| Capability | Main Group | Non-Main Group |
|------------|------------|----------------|
| Project root access | Allowed by policy | Not allowed by default |
| Group folder | `groups/{folder}` (rw) | `groups/{folder}` (rw) |
| Global memory | `groups/CLAUDE.md` (rw) | `groups/CLAUDE.md` (ro) |
| Additional paths | Allowlisted only | Allowlisted, read-only unless explicitly allowed |
| Network access | Unrestricted | Unrestricted |
| MCP tools | All | All |

## Security Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        UNTRUSTED ZONE                             │
│  User Messages (potentially malicious)                            │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
                                 ▼ Input handling and routing
┌──────────────────────────────────────────────────────────────────┐
│                     HOST PROCESS (TRUSTED)                        │
│  • Message routing                                                │
│  • IPC authorization                                              │
│  • Path validation (external allowlist)                           │
│  • Credential handling                                            │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
                                 ▼ Scoped execution
┌──────────────────────────────────────────────────────────────────┐
│                  AGENT SUBPROCESS (SCOPED)                        │
│  • Agent execution                                                │
│  • Bash commands                                                  │
│  • File operations (within allowed paths)                         │
│  • Network access                                                 │
└──────────────────────────────────────────────────────────────────┘
```
