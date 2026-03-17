import {useState, useEffect, useRef, useCallback} from 'react';
import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import {motion, useInView} from 'framer-motion';
import {LaravelIcon, RailsIcon, AdonisIcon} from '../components/FrameworkIcons';
import './landing.css';

const GITHUB_URL = 'https://github.com/startsoft-dev/lumina-server';

// ─── Features (trimmed to 9 most impactful) ────────────────────────────────

const FEATURES = [
  {cmd: 'ai', title: 'AI-Native Architecture', desc: 'Declarative, config-driven models that AI agents can read, scaffold, and extend. Built to be prompted, not hand-coded.', tag: 'ai-ready'},
  {cmd: 'blueprint', title: 'Blueprint Generator', desc: 'Define your permission matrix in YAML and generate fully working policies, tests, and seeders — zero AI tokens, fully deterministic.', tag: 'zero-token'},
  {cmd: 'crud', title: 'Automatic CRUD API', desc: 'Register a model, get full REST endpoints instantly. Index, show, store, update, delete — zero controller code.', tag: 'zero-boilerplate'},
  {cmd: 'auth', title: 'Built-in Authentication', desc: 'Login, logout, register, password recovery and reset. Token-based auth ready out of the box.', tag: 'security'},
  {cmd: 'policy', title: 'Authorization & Policies', desc: 'Convention-based policies with permission-based access control. Fine-grained resource authorization.', tag: 'access-control'},
  {cmd: 'validate', title: 'Smart Validation', desc: 'Role-based validation rules. Separate rules for store and update. Custom error messages per field.', tag: 'data-integrity'},
  {cmd: 'query', title: 'Advanced Querying', desc: 'Filtering, sorting, search, pagination, field selection, and eager loading — all via query parameters.', tag: 'spatie-query-builder'},
  {cmd: 'tenant', title: 'Multi-Tenancy', desc: 'Organization-based data isolation built-in. Subdomain or route-prefix resolution strategies.', tag: 'saas-ready'},
  {cmd: 'generate', title: 'Interactive Generator', desc: 'Scaffold models, migrations, factories, policies, and scopes with a single command in any framework.', tag: 'dx'},
];

// ─── Types & Data ───────────────────────────────────────────────────────────

type ServerFramework = 'laravel' | 'rails' | 'adonis';
type TabDef<T extends string> = {id: T; label: string; icon: React.FC};

const SERVER_TABS: TabDef<ServerFramework>[] = [
  {id: 'laravel', label: 'Laravel', icon: LaravelIcon},
  {id: 'rails', label: 'Rails', icon: RailsIcon},
  {id: 'adonis', label: 'AdonisJS', icon: AdonisIcon},
];

const INSTALL_COMMANDS: Record<ServerFramework, string> = {
  laravel: 'composer require startsoft/lumina',
  rails: 'bundle add lumina-rails',
  adonis: 'npm install @startsoft/lumina-adonis',
};

const MODEL_FILES: Record<ServerFramework, string> = {
  laravel: 'app/Models/Post.php',
  rails: 'app/models/post.rb',
  adonis: 'app/models/post.ts',
};

const CONFIG_FILES: Record<ServerFramework, string> = {
  laravel: 'config/lumina.php',
  rails: 'config/initializers/lumina.rb',
  adonis: 'config/lumina.ts',
};

// ─── Blueprint Output Tabs ──────────────────────────────────────────────────

type BlueprintTab = 'policy' | 'model' | 'migration' | 'tests';

const BLUEPRINT_TABS: {id: BlueprintTab; label: string}[] = [
  {id: 'policy', label: 'Policy'},
  {id: 'model', label: 'Model'},
  {id: 'migration', label: 'Migration'},
  {id: 'tests', label: 'Tests'},
];

const BLUEPRINT_FILES: Record<BlueprintTab, string> = {
  policy: 'app/Policies/ContractPolicy.php',
  model: 'app/Models/Contract.php',
  migration: 'database/migrations/create_contracts_table.php',
  tests: 'tests/Model/ContractTest.php',
};

// ─── Reusable Components ────────────────────────────────────────────────────

function TerminalDots() {
  return (
    <div className="lp-dots">
      <span style={{background: '#ff5f57'}} />
      <span style={{background: '#febc2e'}} />
      <span style={{background: '#28c840'}} />
    </div>
  );
}

function CopyButton({text}: {text: string}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button className="lp-copy-btn" onClick={handleCopy}>
      {copied ? 'copied!' : 'copy'}
    </button>
  );
}

function FadeIn({children, delay = 0, className}: {children: ReactNode; delay?: number; className?: string}) {
  return (
    <motion.div
      initial={{opacity: 0, y: 30}}
      whileInView={{opacity: 1, y: 0}}
      viewport={{once: true, margin: '-80px'}}
      transition={{duration: 0.6, delay, ease: [0.22, 1, 0.36, 1]}}
      className={className}>
      {children}
    </motion.div>
  );
}

function FwTabButton<T extends string>({tab, active, onChange}: {tab: TabDef<T>; active: boolean; onChange: () => void}) {
  return (
    <button className={`lp-fw-tab ${active ? 'lp-fw-tab--active' : ''}`} onClick={onChange}>
      <tab.icon />
      {tab.label}
    </button>
  );
}

function FrameworkTabs<T extends string>({tabs, active, onChange}: {tabs: TabDef<T>[]; active: T; onChange: (id: T) => void}) {
  return (
    <div className="lp-fw-tabs">
      {tabs.map((tab) => (
        <FwTabButton key={tab.id} tab={tab} active={active === tab.id} onChange={() => onChange(tab.id)} />
      ))}
    </div>
  );
}

function TabbedCodeWindow<T extends string>({
  tabs, active, onChange, fileName, children,
}: {tabs: TabDef<T>[]; active: T; onChange: (id: T) => void; fileName: string; children: ReactNode}) {
  return (
    <div className="lp-code-window">
      <div className="lp-code-window-bar">
        <TerminalDots />
        <span className="lp-file-name">{fileName}</span>
      </div>
      <FrameworkTabs tabs={tabs} active={active} onChange={onChange} />
      <div className="lp-code-content">{children}</div>
    </div>
  );
}

// ─── Animated Terminal (Aceternity-inspired, no sound) ──────────────────────

const TERMINAL_COMMANDS = [
  'php artisan lumina:blueprint',
  'php artisan test --filter=ContractTest',
  'curl -s -X POST localhost:8000/api/acme/contracts -H "Authorization: Bearer $TOKEN" -d \'{"title":"NDA Agreement","status":"draft"}\' | jq .data',
  'curl -s localhost:8000/api/acme/contracts -H "Authorization: Bearer $TOKEN" | jq .data',
];

const TERMINAL_OUTPUTS: Record<number, string[]> = {
  0: [
    '  Lumina Blueprint v1.0',
    '  Processing contracts.yaml...',
    '',
    '  \u2713 Model        app/Models/Contract.php',
    '  \u2713 Migration    create_contracts_table.php',
    '  \u2713 Factory      ContractFactory.php',
    '  \u2713 Policy       ContractPolicy.php',
    '  \u2713 Tests        ContractTest.php',
    '  \u2713 Seeder       UserRoleSeeder.php',
    '',
    '  Done. 6 files generated from YAML — zero AI tokens used.',
  ],
  1: [
    '',
    '  PASS  Tests\\Model\\ContractTest',
    '  \u2713 admin can access all contract fields',
    '  \u2713 viewer cannot see total_value',
    '  \u2713 analyst gets 403 on restricted fields',
    '  \u2713 owner can perform all CRUD actions',
    '',
    '  Tests:    4 passed',
    '  Time:     0.42s',
  ],
  2: [
    '  {',
    '    "id": 1,',
    '    "title": "NDA Agreement",',
    '    "status": "draft",',
    '    "organization_id": 42,',
    '    "created_at": "2026-03-14T10:32:00Z"',
    '  }',
  ],
  3: [
    '  [',
    '    {',
    '      "id": 1,',
    '      "title": "NDA Agreement",',
    '      "status": "draft"',
    '    },',
    '    {',
    '      "id": 2,',
    '      "title": "SaaS License v2",',
    '      "status": "active"',
    '    }',
    '  ]',
  ],
};

function AnimatedTerminal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, {once: true, margin: '-100px'});
  const [lines, setLines] = useState<{type: 'prompt' | 'command' | 'output'; text: string}[]>([]);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const animationRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    animationRef.current.forEach(clearTimeout);
    animationRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    animationRef.current.push(t);
    return t;
  }, []);

  // Cursor blink
  useEffect(() => {
    const interval = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [lines]);

  // Main animation
  useEffect(() => {
    if (!isInView) return;

    let t = 400; // initial delay
    const delayBetweenCommands = 900;

    TERMINAL_COMMANDS.forEach((cmd, cmdIndex) => {
      // Faster typing for long commands (curl)
      const typingSpeed = cmd.length > 60 ? 18 : 40;

      // Show prompt
      const promptTime = t;
      schedule(() => {
        setIsTyping(true);
        setLines((prev) => [...prev, {type: 'prompt', text: ''}]);
      }, promptTime);
      t += 200;

      // Type command character by character
      for (let i = 0; i < cmd.length; i++) {
        const charTime = t + i * typingSpeed;
        const partial = cmd.slice(0, i + 1);
        schedule(() => {
          setLines((prev) => {
            const next = [...prev];
            next[next.length - 1] = {type: 'command', text: partial};
            return next;
          });
        }, charTime);
      }
      t += cmd.length * typingSpeed + 300;

      // "Press enter" — stop typing cursor
      schedule(() => setIsTyping(false), t);
      t += 200;

      // Show output lines one by one
      const outputs = TERMINAL_OUTPUTS[cmdIndex] || [];
      outputs.forEach((outputLine, lineIndex) => {
        const lineTime = t + lineIndex * 60;
        schedule(() => {
          setLines((prev) => [...prev, {type: 'output', text: outputLine}]);
        }, lineTime);
      });
      t += outputs.length * 60 + delayBetweenCommands;
    });

    return () => clearTimers();
  }, [isInView, clearTimers, schedule]);

  return (
    <div ref={containerRef} className="lp-animated-terminal">
      <div className="lp-at-bar">
        <TerminalDots />
        <span className="lp-at-title">terminal</span>
      </div>
      <div ref={contentRef} className="lp-at-content">
        {lines.map((line, i) => {
          const isLastLine = i === lines.length - 1;
          const showCursor = isLastLine && isTyping && cursorVisible;

          if (line.type === 'prompt' || line.type === 'command') {
            return (
              <div key={i} className="lp-at-line">
                <span className="lp-at-prompt">$</span>
                <span className="lp-at-cmd">{highlightBash(line.text)}</span>
                {showCursor && <span className="lp-at-cursor" />}
              </div>
            );
          }

          return (
            <div key={i} className="lp-at-line lp-at-output">
              {highlightOutput(line.text)}
            </div>
          );
        })}
        {lines.length === 0 && (
          <div className="lp-at-line">
            <span className="lp-at-prompt">$</span>
            {cursorVisible && <span className="lp-at-cursor" />}
          </div>
        )}
      </div>
    </div>
  );
}

function highlightBash(text: string): ReactNode {
  // Tokenize with regex to handle quoted strings, flags, pipe, etc.
  const tokens = text.match(/"[^"]*"|'[^']*'|-[A-Za-z]+|--[A-Za-z-]+|\||\$[A-Z_]+|[^\s]+|\s+/g) || [];
  let isFirstWord = true;
  let isSecondWord = false;

  return tokens.map((token, i) => {
    // Skip whitespace tokens but render them
    if (/^\s+$/.test(token)) return <span key={i}>{token}</span>;

    // First non-whitespace = binary
    if (isFirstWord) {
      isFirstWord = false;
      isSecondWord = true;
      return <span key={i} className="lp-at-binary">{token}</span>;
    }

    // Second non-whitespace = subcommand (for artisan-style commands)
    if (isSecondWord) {
      isSecondWord = false;
      // For curl, the second token is a flag (-s, -X), not a subcommand
      if (token.startsWith('-')) {
        return <span key={i} className="lp-at-flag">{token}</span>;
      }
      return <span key={i} className="lp-at-subcmd">{token}</span>;
    }

    // Pipe operator
    if (token === '|') return <span key={i} className="lp-at-dim">{token}</span>;

    // After pipe, next word is a binary (jq, grep, etc.)
    if (i > 0 && tokens[i - 1]?.trim() === '|') {
      return <span key={i} className="lp-at-binary">{token}</span>;
    }

    // Flags: -s, -X, -H, -d, --filter
    if (/^-/.test(token)) return <span key={i} className="lp-at-flag">{token}</span>;

    // Quoted strings
    if (/^["']/.test(token)) return <span key={i} className="lp-at-string">{token}</span>;

    // Environment variables
    if (/^\$/.test(token)) return <span key={i} className="lp-at-flag">{token}</span>;

    // URLs / paths
    if (token.includes('localhost') || token.includes('/')) {
      return <span key={i} className="lp-at-url">{token}</span>;
    }

    return <span key={i}>{token}</span>;
  });
}

function highlightJson(text: string): ReactNode {
  // JSON syntax highlighting — jq-style colors
  const trimmed = text.trimStart();
  const indent = text.slice(0, text.length - trimmed.length);

  // Brackets / braces only
  if (/^[\[\]{}],?$/.test(trimmed)) {
    return <><span>{indent}</span><span className="lp-at-json-brace">{trimmed}</span></>;
  }

  // Key-value pairs: "key": value
  const kvMatch = trimmed.match(/^("[\w_]+")\s*:\s*(.+)$/);
  if (kvMatch) {
    const [, key, rawVal] = kvMatch;
    const valTrimmed = rawVal.replace(/,\s*$/, '');
    const trailing = rawVal.endsWith(',') ? ',' : '';

    let valNode: ReactNode;
    if (/^"/.test(valTrimmed)) {
      valNode = <span className="lp-at-json-string">{valTrimmed}</span>;
    } else if (/^\d/.test(valTrimmed)) {
      valNode = <span className="lp-at-json-number">{valTrimmed}</span>;
    } else {
      valNode = <span>{valTrimmed}</span>;
    }

    return (
      <>
        <span>{indent}</span>
        <span className="lp-at-json-key">{key}</span>
        <span className="lp-at-json-brace">: </span>
        {valNode}
        <span className="lp-at-json-brace">{trailing}</span>
      </>
    );
  }

  return text;
}

function highlightOutput(text: string): ReactNode {
  // JSON detection — lines starting with { [ or containing "key":
  const trimmed = text.trimStart();
  if (/^[\[\]{}]/.test(trimmed) || /^\s*"[\w_]+"/.test(text)) {
    return highlightJson(text);
  }

  if (text.includes('\u2713')) {
    const parts = text.split('\u2713');
    return (
      <>
        {parts[0]}
        <span className="lp-at-success">{'\u2713'}</span>
        {parts[1]}
      </>
    );
  }
  if (text.includes('PASS')) {
    return <span className="lp-at-success">{text}</span>;
  }
  if (text.includes('Tests:') || text.includes('Time:')) {
    return <span className="lp-at-dim">{text}</span>;
  }
  if (text.includes('Done.') || text.includes('zero AI tokens')) {
    return <span className="lp-at-highlight">{text}</span>;
  }
  return text;
}

// ─── Model Code Components (kept from original) ────────────────────────────

function LaravelModelCode() {
  return (
    <>
      <span className="lp-line"><span className="lp-kw">&lt;?php</span></span>
      <span className="lp-line"> </span>
      <span className="lp-line"><span className="lp-kw">namespace</span> App\Models;</span>
      <span className="lp-line"> </span>
      <span className="lp-line"><span className="lp-kw">use</span> Illuminate\Database\Eloquent\<span className="lp-cn">Model</span>;</span>
      <span className="lp-line"><span className="lp-kw">use</span> Illuminate\Database\Eloquent\<span className="lp-cn">SoftDeletes</span>;</span>
      <span className="lp-line"><span className="lp-kw">use</span> Lumina\LaravelApi\Traits\<span className="lp-cn">HasValidation</span>;</span>
      <span className="lp-line"> </span>
      <span className="lp-line"><span className="lp-kw">class</span> <span className="lp-cn">Post</span> <span className="lp-kw">extends</span> <span className="lp-cn">Model</span></span>
      <span className="lp-line">{'{'}</span>
      <span className="lp-line">    <span className="lp-kw">use</span> <span className="lp-cn">SoftDeletes</span>, <span className="lp-cn">HasValidation</span>;</span>
      <span className="lp-line"> </span>
      <span className="lp-line">    <span className="lp-kw">protected</span> <span className="lp-var">$fillable</span> = [<span className="lp-str">'title'</span>, <span className="lp-str">'body'</span>, <span className="lp-str">'status'</span>];</span>
      <span className="lp-line"> </span>
      <span className="lp-line">    <span className="lp-kw">public static</span> <span className="lp-var">$allowedFilters</span> = [<span className="lp-str">'status'</span>, <span className="lp-str">'user_id'</span>];</span>
      <span className="lp-line">    <span className="lp-kw">public static</span> <span className="lp-var">$allowedSorts</span>   = [<span className="lp-str">'created_at'</span>, <span className="lp-str">'title'</span>];</span>
      <span className="lp-line">    <span className="lp-kw">public static</span> <span className="lp-var">$allowedIncludes</span>= [<span className="lp-str">'user'</span>, <span className="lp-str">'comments'</span>];</span>
      <span className="lp-line"> </span>
      <span className="lp-line">    <span className="lp-kw">protected</span> <span className="lp-var">$validationRules</span> = [</span>
      <span className="lp-line">        <span className="lp-str">'title'</span>  <span className="lp-op">=&gt;</span> <span className="lp-str">'required|string|max:255'</span>,</span>
      <span className="lp-line">        <span className="lp-str">'body'</span>   <span className="lp-op">=&gt;</span> <span className="lp-str">'required|string'</span>,</span>
      <span className="lp-line">        <span className="lp-str">'status'</span> <span className="lp-op">=&gt;</span> <span className="lp-str">'in:draft,published'</span>,</span>
      <span className="lp-line">    ];</span>
      <span className="lp-line">{'}'}</span>
    </>
  );
}

function RailsModelCode() {
  return (
    <>
      <span className="lp-line"><span className="lp-kw">class</span> <span className="lp-cn">Post</span> <span className="lp-op">&lt;</span> <span className="lp-cn">ApplicationRecord</span></span>
      <span className="lp-line">  <span className="lp-kw">include</span> <span className="lp-cn">Lumina::HasLumina</span></span>
      <span className="lp-line">  <span className="lp-kw">include</span> <span className="lp-cn">Lumina::HasValidation</span></span>
      <span className="lp-line"> </span>
      <span className="lp-line">  <span className="lp-fn">has_discard</span></span>
      <span className="lp-line"> </span>
      <span className="lp-line">  <span className="lp-fn">validates</span> <span className="lp-var">:title</span>,  <span className="lp-var">length:</span> {'{'} <span className="lp-var">maximum:</span> <span className="lp-num">255</span> {'}'}, <span className="lp-var">allow_nil:</span> <span className="lp-kw">true</span></span>
      <span className="lp-line">  <span className="lp-fn">validates</span> <span className="lp-var">:status</span>, <span className="lp-var">inclusion:</span> {'{'} <span className="lp-var">in:</span> <span className="lp-str">%w[draft published]</span> {'}'}, <span className="lp-var">allow_nil:</span> <span className="lp-kw">true</span></span>
      <span className="lp-line"> </span>
      <span className="lp-line">  <span className="lp-fn">lumina_filters</span>  <span className="lp-var">:status</span>, <span className="lp-var">:user_id</span></span>
      <span className="lp-line">  <span className="lp-fn">lumina_sorts</span>    <span className="lp-var">:created_at</span>, <span className="lp-var">:title</span></span>
      <span className="lp-line">  <span className="lp-fn">lumina_includes</span> <span className="lp-var">:user</span>, <span className="lp-var">:comments</span></span>
      <span className="lp-line"> </span>
      <span className="lp-line">  <span className="lp-kw">belongs_to</span> <span className="lp-var">:user</span></span>
      <span className="lp-line">  <span className="lp-kw">has_many</span>   <span className="lp-var">:comments</span></span>
      <span className="lp-line"><span className="lp-kw">end</span></span>
    </>
  );
}

function AdonisModelCode() {
  return (
    <>
      <span className="lp-line"><span className="lp-kw">import</span> {'{'} <span className="lp-cn">BaseModel</span>, <span className="lp-cn">column</span>, <span className="lp-cn">belongsTo</span>, <span className="lp-cn">hasMany</span> {'}'} <span className="lp-kw">from</span> <span className="lp-str">'@adonisjs/lucid/orm'</span></span>
      <span className="lp-line"><span className="lp-kw">import</span> {'{'} <span className="lp-fn">compose</span> {'}'} <span className="lp-kw">from</span> <span className="lp-str">'@adonisjs/core/helpers'</span></span>
      <span className="lp-line"><span className="lp-kw">import</span> {'{'} <span className="lp-cn">HasLumina</span> {'}'} <span className="lp-kw">from</span> <span className="lp-str">'@startsoft/lumina-adonis/mixins/has_lumina'</span></span>
      <span className="lp-line"><span className="lp-kw">import</span> {'{'} <span className="lp-cn">HasValidation</span> {'}'} <span className="lp-kw">from</span> <span className="lp-str">'@startsoft/lumina-adonis/mixins/has_validation'</span></span>
      <span className="lp-line"> </span>
      <span className="lp-line"><span className="lp-kw">export default class</span> <span className="lp-cn">Post</span> <span className="lp-kw">extends</span> <span className="lp-fn">compose</span>(<span className="lp-cn">BaseModel</span>, <span className="lp-cn">HasLumina</span>, <span className="lp-cn">HasValidation</span>) {'{'}</span>
      <span className="lp-line">  <span className="lp-fn">@column</span>({'{'} <span className="lp-var">isPrimary</span>: <span className="lp-kw">true</span> {'}'}) <span className="lp-kw">declare</span> <span className="lp-var">id</span>: <span className="lp-cn">number</span></span>
      <span className="lp-line">  <span className="lp-fn">@column</span>() <span className="lp-kw">declare</span> <span className="lp-var">title</span>: <span className="lp-cn">string</span></span>
      <span className="lp-line">  <span className="lp-fn">@column</span>() <span className="lp-kw">declare</span> <span className="lp-var">body</span>: <span className="lp-cn">string</span></span>
      <span className="lp-line">  <span className="lp-fn">@column</span>() <span className="lp-kw">declare</span> <span className="lp-var">status</span>: <span className="lp-cn">string</span></span>
      <span className="lp-line"> </span>
      <span className="lp-line">  <span className="lp-kw">static</span> <span className="lp-var">$allowedFilters</span> = [<span className="lp-str">'status'</span>, <span className="lp-str">'user_id'</span>]</span>
      <span className="lp-line">  <span className="lp-kw">static</span> <span className="lp-var">$allowedSorts</span>   = [<span className="lp-str">'created_at'</span>, <span className="lp-str">'title'</span>]</span>
      <span className="lp-line">  <span className="lp-kw">static</span> <span className="lp-var">$allowedIncludes</span>= [<span className="lp-str">'user'</span>, <span className="lp-str">'comments'</span>]</span>
      <span className="lp-line"> </span>
      <span className="lp-line">  <span className="lp-kw">static</span> <span className="lp-var">$validationRules</span> = {'{'}</span>
      <span className="lp-line">    <span className="lp-var">title</span>:  <span className="lp-str">'required|string|max:255'</span>,</span>
      <span className="lp-line">    <span className="lp-var">body</span>:   <span className="lp-str">'required|string'</span>,</span>
      <span className="lp-line">    <span className="lp-var">status</span>: <span className="lp-str">'in:draft,published'</span>,</span>
      <span className="lp-line">  {'}'}</span>
      <span className="lp-line"> </span>
      <span className="lp-line">  <span className="lp-fn">@belongsTo</span>(() =&gt; <span className="lp-cn">User</span>) <span className="lp-kw">declare</span> <span className="lp-var">user</span>: <span className="lp-cn">BelongsTo</span>&lt;<span className="lp-kw">typeof</span> <span className="lp-cn">User</span>&gt;</span>
      <span className="lp-line">  <span className="lp-fn">@hasMany</span>(() =&gt; <span className="lp-cn">Comment</span>) <span className="lp-kw">declare</span> <span className="lp-var">comments</span>: <span className="lp-cn">HasMany</span>&lt;<span className="lp-kw">typeof</span> <span className="lp-cn">Comment</span>&gt;</span>
      <span className="lp-line">{'}'}</span>
    </>
  );
}

function LaravelConfigCode() {
  return (
    <>
      <span className="lp-line"><span className="lp-kw">return</span> [</span>
      <span className="lp-line">    <span className="lp-str">'models'</span> <span className="lp-op">=&gt;</span> [</span>
      <span className="lp-line">        <span className="lp-str">'posts'</span> <span className="lp-op">=&gt;</span> \App\Models\<span className="lp-cn">Post</span>::<span className="lp-kw">class</span>,</span>
      <span className="lp-line">    ],</span>
      <span className="lp-line">];</span>
    </>
  );
}

function RailsConfigCode() {
  return (
    <>
      <span className="lp-line"><span className="lp-cn">Lumina</span>.<span className="lp-fn">configure</span> <span className="lp-kw">do</span> |<span className="lp-var">c</span>|</span>
      <span className="lp-line">  <span className="lp-var">c</span>.<span className="lp-fn">model</span> <span className="lp-var">:posts</span>, <span className="lp-str">'Post'</span></span>
      <span className="lp-line"><span className="lp-kw">end</span></span>
    </>
  );
}

function AdonisConfigCode() {
  return (
    <>
      <span className="lp-line"><span className="lp-kw">export default</span> <span className="lp-fn">defineConfig</span>({'{'}</span>
      <span className="lp-line">  <span className="lp-var">models</span>: {'{'}</span>
      <span className="lp-line">    <span className="lp-var">posts</span>: () =&gt; <span className="lp-kw">import</span>(<span className="lp-str">'#models/post'</span>),</span>
      <span className="lp-line">  {'}'},</span>
      <span className="lp-line">{'}'});</span>
    </>
  );
}

// ─── Blueprint Generated Code Components ────────────────────────────────────

function BlueprintPolicyCode() {
  return (
    <>
      <span className="lp-line"><span className="lp-kw">class</span> <span className="lp-cn">ContractPolicy</span> <span className="lp-kw">extends</span> <span className="lp-cn">ResourcePolicy</span></span>
      <span className="lp-line">{'{'}</span>
      <span className="lp-line">    <span className="lp-kw">public function</span> <span className="lp-fn">permittedAttributesForShow</span>(<span className="lp-var">$user</span>): <span className="lp-cn">array</span></span>
      <span className="lp-line">    {'{'}</span>
      <span className="lp-line">        <span className="lp-kw">if</span> (<span className="lp-var">$this</span>-&gt;<span className="lp-fn">hasRole</span>(<span className="lp-var">$user</span>, <span className="lp-str">'admin'</span>)) {'{'}</span>
      <span className="lp-line">            <span className="lp-kw">return</span> [<span className="lp-str">'*'</span>];</span>
      <span className="lp-line">        {'}'}</span>
      <span className="lp-line">        <span className="lp-kw">return</span> [<span className="lp-str">'id'</span>, <span className="lp-str">'title'</span>, <span className="lp-str">'status'</span>];</span>
      <span className="lp-line">    {'}'}</span>
      <span className="lp-line"> </span>
      <span className="lp-line">    <span className="lp-kw">public function</span> <span className="lp-fn">permittedAttributesForCreate</span>(<span className="lp-var">$user</span>): <span className="lp-cn">array</span></span>
      <span className="lp-line">    {'{'}</span>
      <span className="lp-line">        <span className="lp-kw">return</span> [<span className="lp-str">'title'</span>, <span className="lp-str">'total_value'</span>, <span className="lp-str">'status'</span>];</span>
      <span className="lp-line">    {'}'}</span>
      <span className="lp-line"> </span>
      <span className="lp-line">    <span className="lp-kw">public function</span> <span className="lp-fn">permittedAttributesForUpdate</span>(<span className="lp-var">$user</span>): <span className="lp-cn">array</span></span>
      <span className="lp-line">    {'{'}</span>
      <span className="lp-line">        <span className="lp-kw">return</span> [<span className="lp-str">'title'</span>, <span className="lp-str">'status'</span>];</span>
      <span className="lp-line">    {'}'}</span>
      <span className="lp-line">{'}'}</span>
    </>
  );
}

function BlueprintModelCode() {
  return (
    <>
      <span className="lp-line"><span className="lp-kw">&lt;?php</span></span>
      <span className="lp-line"> </span>
      <span className="lp-line"><span className="lp-kw">namespace</span> App\Models;</span>
      <span className="lp-line"> </span>
      <span className="lp-line"><span className="lp-kw">use</span> Illuminate\Database\Eloquent\<span className="lp-cn">Model</span>;</span>
      <span className="lp-line"><span className="lp-kw">use</span> Illuminate\Database\Eloquent\<span className="lp-cn">SoftDeletes</span>;</span>
      <span className="lp-line"><span className="lp-kw">use</span> Lumina\LaravelApi\Traits\<span className="lp-cn">HasValidation</span>;</span>
      <span className="lp-line"> </span>
      <span className="lp-line"><span className="lp-kw">class</span> <span className="lp-cn">Contract</span> <span className="lp-kw">extends</span> <span className="lp-cn">Model</span></span>
      <span className="lp-line">{'{'}</span>
      <span className="lp-line">    <span className="lp-kw">use</span> <span className="lp-cn">SoftDeletes</span>, <span className="lp-cn">HasValidation</span>;</span>
      <span className="lp-line"> </span>
      <span className="lp-line">    <span className="lp-kw">protected</span> <span className="lp-var">$fillable</span> = [<span className="lp-str">'title'</span>, <span className="lp-str">'total_value'</span>, <span className="lp-str">'status'</span>];</span>
      <span className="lp-line"> </span>
      <span className="lp-line">    <span className="lp-kw">public static</span> <span className="lp-var">$allowedFilters</span> = [<span className="lp-str">'status'</span>];</span>
      <span className="lp-line">    <span className="lp-kw">public static</span> <span className="lp-var">$allowedSorts</span>   = [<span className="lp-str">'created_at'</span>, <span className="lp-str">'title'</span>];</span>
      <span className="lp-line"> </span>
      <span className="lp-line">    <span className="lp-kw">protected</span> <span className="lp-var">$validationRules</span> = [</span>
      <span className="lp-line">        <span className="lp-str">'title'</span>       <span className="lp-op">=&gt;</span> <span className="lp-str">'required|string|max:255'</span>,</span>
      <span className="lp-line">        <span className="lp-str">'total_value'</span> <span className="lp-op">=&gt;</span> <span className="lp-str">'nullable|decimal:0,2'</span>,</span>
      <span className="lp-line">        <span className="lp-str">'status'</span>      <span className="lp-op">=&gt;</span> <span className="lp-str">'in:draft,active,expired'</span>,</span>
      <span className="lp-line">    ];</span>
      <span className="lp-line">{'}'}</span>
    </>
  );
}

function BlueprintMigrationCode() {
  return (
    <>
      <span className="lp-line"><span className="lp-kw">&lt;?php</span></span>
      <span className="lp-line"> </span>
      <span className="lp-line"><span className="lp-kw">return new class extends</span> <span className="lp-cn">Migration</span></span>
      <span className="lp-line">{'{'}</span>
      <span className="lp-line">    <span className="lp-kw">public function</span> <span className="lp-fn">up</span>(): <span className="lp-cn">void</span></span>
      <span className="lp-line">    {'{'}</span>
      <span className="lp-line">        <span className="lp-cn">Schema</span>::<span className="lp-fn">create</span>(<span className="lp-str">'contracts'</span>, <span className="lp-kw">function</span> (<span className="lp-cn">Blueprint</span> <span className="lp-var">$table</span>) {'{'}</span>
      <span className="lp-line">            <span className="lp-var">$table</span>-&gt;<span className="lp-fn">id</span>();</span>
      <span className="lp-line">            <span className="lp-var">$table</span>-&gt;<span className="lp-fn">string</span>(<span className="lp-str">'title'</span>);</span>
      <span className="lp-line">            <span className="lp-var">$table</span>-&gt;<span className="lp-fn">decimal</span>(<span className="lp-str">'total_value'</span>, <span className="lp-num">10</span>, <span className="lp-num">2</span>)-&gt;<span className="lp-fn">nullable</span>();</span>
      <span className="lp-line">            <span className="lp-var">$table</span>-&gt;<span className="lp-fn">string</span>(<span className="lp-str">'status'</span>)-&gt;<span className="lp-fn">default</span>(<span className="lp-str">'draft'</span>);</span>
      <span className="lp-line">            <span className="lp-var">$table</span>-&gt;<span className="lp-fn">timestamps</span>();</span>
      <span className="lp-line">            <span className="lp-var">$table</span>-&gt;<span className="lp-fn">softDeletes</span>();</span>
      <span className="lp-line">        {'}'});</span>
      <span className="lp-line">    {'}'}</span>
      <span className="lp-line">{'}'};
</span>
    </>
  );
}

function BlueprintTestCode() {
  return (
    <>
      <span className="lp-line"><span className="lp-fn">it</span>(<span className="lp-str">'shows only permitted fields for viewer'</span>, <span className="lp-kw">function</span> () {'{'}</span>
      <span className="lp-line">    <span className="lp-var">$user</span> = <span className="lp-fn">createUserWithRole</span>(<span className="lp-str">'viewer'</span>, <span className="lp-var">$org</span>);</span>
      <span className="lp-line">    <span className="lp-var">$contract</span> = <span className="lp-cn">Contract</span>::<span className="lp-fn">factory</span>()-&gt;<span className="lp-fn">create</span>();</span>
      <span className="lp-line"> </span>
      <span className="lp-line">    <span className="lp-var">$response</span> = <span className="lp-var">$this</span>-&gt;<span className="lp-fn">actingAs</span>(<span className="lp-var">$user</span>)</span>
      <span className="lp-line">        -&gt;<span className="lp-fn">getJson</span>(<span className="lp-str">"/api/{'{'}<span className="lp-var">$org-&gt;slug</span>{'}'}/contracts/{'{'}<span className="lp-var">$contract-&gt;id</span>{'}'}"</span>);</span>
      <span className="lp-line"> </span>
      <span className="lp-line">    <span className="lp-var">$response</span>-&gt;<span className="lp-fn">assertOk</span>();</span>
      <span className="lp-line">    <span className="lp-var">$data</span> = <span className="lp-var">$response</span>-&gt;<span className="lp-fn">json</span>();</span>
      <span className="lp-line">    <span className="lp-var">$this</span>-&gt;<span className="lp-fn">assertArrayHasKey</span>(<span className="lp-str">'title'</span>, <span className="lp-var">$data</span>);</span>
      <span className="lp-line">    <span className="lp-var">$this</span>-&gt;<span className="lp-fn">assertArrayNotHasKey</span>(<span className="lp-str">'total_value'</span>, <span className="lp-var">$data</span>); <span className="lp-cm">// hidden!</span></span>
      <span className="lp-line">{'}'});</span>
      <span className="lp-line"> </span>
      <span className="lp-line"><span className="lp-fn">it</span>(<span className="lp-str">'returns 403 when viewer tries to update'</span>, <span className="lp-kw">function</span> () {'{'}</span>
      <span className="lp-line">    <span className="lp-var">$user</span> = <span className="lp-fn">createUserWithRole</span>(<span className="lp-str">'viewer'</span>, <span className="lp-var">$org</span>);</span>
      <span className="lp-line">    <span className="lp-var">$contract</span> = <span className="lp-cn">Contract</span>::<span className="lp-fn">factory</span>()-&gt;<span className="lp-fn">create</span>();</span>
      <span className="lp-line"> </span>
      <span className="lp-line">    <span className="lp-var">$this</span>-&gt;<span className="lp-fn">actingAs</span>(<span className="lp-var">$user</span>)</span>
      <span className="lp-line">        -&gt;<span className="lp-fn">putJson</span>(<span className="lp-str">"/api/contracts/{'{'}<span className="lp-var">$contract-&gt;id</span>{'}'}"</span>, [<span className="lp-str">'title'</span> <span className="lp-op">=&gt;</span> <span className="lp-str">'x'</span>])</span>
      <span className="lp-line">        -&gt;<span className="lp-fn">assertForbidden</span>();</span>
      <span className="lp-line">{'}'});</span>
    </>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function Home(): ReactNode {
  const [serverFw, setServerFw] = useState<ServerFramework>('laravel');
  const [installFw, setInstallFw] = useState<ServerFramework>('laravel');
  const [blueprintTab, setBlueprintTab] = useState<BlueprintTab>('policy');

  return (
    <Layout
      title="The AI-Ready API Framework"
      description="Lumina — the AI-ready API framework. Define permissions in YAML, generate fully working policies, tests, and seeders. Zero AI tokens. Laravel, Rails, AdonisJS.">
      <div className="lp">
        {/* ═══════════ HERO ═══════════ */}
        <section className="lp-hero">
          <div className="lp-hero-grid" />
          <div className="lp-hero-glow" />

          <div className="lp-hero-inner">
            <div className="lp-hero-content">
              <motion.div
                className="lp-badge"
                initial={{opacity: 0, scale: 0.9}}
                animate={{opacity: 1, scale: 1}}
                transition={{duration: 0.5, delay: 0.1}}>
                AI-READY FRAMEWORK
              </motion.div>

              <motion.h1
                className="lp-hero-headline"
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.6, delay: 0.2}}>
                Ship APIs in minutes.{' '}
                <span className="lp-hero-accent">Zero AI tokens.</span>
              </motion.h1>

              <motion.p
                className="lp-hero-sub"
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.6, delay: 0.35}}>
                Define your permission matrix in YAML. Generate fully working policies, tests, and seeders — deterministically. For Laravel, Rails, and AdonisJS.
              </motion.p>

              <motion.div
                className="lp-hero-install"
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.6, delay: 0.5}}>
                <div className="lp-install-tabs-mini">
                  {SERVER_TABS.map((t) => (
                    <button
                      key={t.id}
                      className={`lp-install-tab-mini ${installFw === t.id ? 'lp-install-tab-mini--active' : ''}`}
                      onClick={() => setInstallFw(t.id)}>
                      <t.icon /> {t.label}
                    </button>
                  ))}
                </div>
                <div className="lp-install-bar">
                  <span className="lp-dollar">$</span>
                  <code>{INSTALL_COMMANDS[installFw]}</code>
                  <CopyButton text={INSTALL_COMMANDS[installFw]} />
                </div>
              </motion.div>

              <motion.div
                className="lp-hero-buttons"
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.6, delay: 0.6}}>
                <Link className="lp-btn-primary" to="/docs/server/getting-started">
                  Get Started
                </Link>
                <Link className="lp-btn-secondary" href={GITHUB_URL}>
                  &#9733; Star on GitHub
                </Link>
              </motion.div>
            </div>

            <motion.div
              className="lp-hero-terminal"
              initial={{opacity: 0, x: 40}}
              animate={{opacity: 1, x: 0}}
              transition={{duration: 0.8, delay: 0.4}}>
              <AnimatedTerminal />
            </motion.div>
          </div>
        </section>

        {/* ═══════════ AI CHAT SIMULATION ═══════════ */}
        <section className="lp-aichat-section">
          <FadeIn>
            <div className="lp-section-header">
              <span className="lp-section-badge">AI-POWERED</span>
              <h2>Describe what you need. AI writes the Blueprint.</h2>
              <p>Use Claude or any AI agent to generate production-ready Blueprint YAML from plain English.</p>
            </div>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="lp-aichat-window lp-glow">
              <div className="lp-aichat-bar">
                <TerminalDots />
                <span className="lp-aichat-bar-title">Claude Code</span>
              </div>
              <div className="lp-aichat-messages">
                {/* User message 1 */}
                <motion.div
                  className="lp-aichat-msg lp-aichat-msg--user"
                  initial={{opacity: 0, y: 16}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true, margin: '-60px'}}
                  transition={{duration: 0.5, delay: 0.3}}>
                  Create a Contract model with title, total_value, and status. Admins can create all fields but only update title and status. Viewers can only see id, title, and status.
                </motion.div>

                {/* AI response with YAML */}
                <motion.div
                  className="lp-aichat-msg lp-aichat-msg--ai"
                  initial={{opacity: 0, y: 16}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true, margin: '-60px'}}
                  transition={{duration: 0.5, delay: 0.7}}>
                  <div className="lp-aichat-msg-header">
                    <span className="lp-aichat-avatar">&#9672;</span>
                    Claude
                  </div>
                  <div className="lp-aichat-skill">using skill <code>blueprint-creator</code></div>
                  Here&apos;s the Blueprint for your Contract resource:
                  <div className="lp-aichat-yaml">
                    <span className="lp-line"><span className="lp-var">model</span>: <span className="lp-cn">Contract</span></span>
                    <span className="lp-line"><span className="lp-var">columns</span>:</span>
                    <span className="lp-line">  <span className="lp-var">title</span>:     {'{'} <span className="lp-var">type</span>: <span className="lp-str">string</span>, <span className="lp-var">filterable</span>: <span className="lp-kw">true</span> {'}'}</span>
                    <span className="lp-line">  <span className="lp-var">total_value</span>: {'{'} <span className="lp-var">type</span>: <span className="lp-str">decimal</span>, <span className="lp-var">nullable</span>: <span className="lp-kw">true</span> {'}'}</span>
                    <span className="lp-line">  <span className="lp-var">status</span>:    {'{'} <span className="lp-var">type</span>: <span className="lp-str">string</span>, <span className="lp-var">default</span>: <span className="lp-str">"draft"</span> {'}'}</span>
                    <span className="lp-line"> </span>
                    <span className="lp-line"><span className="lp-var">permissions</span>:</span>
                    <span className="lp-line">  <span className="lp-var">admin</span>:</span>
                    <span className="lp-line">    <span className="lp-var">actions</span>: [<span className="lp-str">index</span>, <span className="lp-str">show</span>, <span className="lp-str">store</span>, <span className="lp-str">update</span>, <span className="lp-str">destroy</span>]</span>
                    <span className="lp-line">    <span className="lp-var">show_fields</span>: <span className="lp-str">"*"</span></span>
                    <span className="lp-line">    <span className="lp-var">create_fields</span>: [<span className="lp-str">title</span>, <span className="lp-str">total_value</span>, <span className="lp-str">status</span>]</span>
                    <span className="lp-line">    <span className="lp-var">update_fields</span>: [<span className="lp-str">title</span>, <span className="lp-str">status</span>]</span>
                    <span className="lp-line">  <span className="lp-var">viewer</span>:</span>
                    <span className="lp-line">    <span className="lp-var">actions</span>: [<span className="lp-str">index</span>, <span className="lp-str">show</span>]</span>
                    <span className="lp-line">    <span className="lp-var">show_fields</span>: [<span className="lp-str">id</span>, <span className="lp-str">title</span>, <span className="lp-str">status</span>]</span>
                  </div>
                </motion.div>

                {/* User message 2 */}
                <motion.div
                  className="lp-aichat-msg lp-aichat-msg--user"
                  initial={{opacity: 0, y: 16}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true, margin: '-60px'}}
                  transition={{duration: 0.5, delay: 1.1}}>
                  Now generate the code.
                </motion.div>

                {/* AI response - running blueprint */}
                <motion.div
                  className="lp-aichat-msg lp-aichat-msg--ai"
                  initial={{opacity: 0, y: 16}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true, margin: '-60px'}}
                  transition={{duration: 0.5, delay: 1.5}}>
                  <div className="lp-aichat-msg-header">
                    <span className="lp-aichat-avatar">&#9672;</span>
                    Claude
                  </div>
                  Running <code className="lp-aichat-inline-code">php artisan lumina:blueprint</code> for you:
                  <div className="lp-aichat-terminal">
                    <span className="lp-line"><span className="lp-cm">$</span> php artisan lumina:blueprint</span>
                    <span className="lp-line"> </span>
                    <span className="lp-line">  Lumina Blueprint v1.0</span>
                    <span className="lp-line">  Processing contracts.yaml...</span>
                    <span className="lp-line"> </span>
                    <span className="lp-line">  <span className="lp-at-success">✓</span> Model        app/Models/Contract.php</span>
                    <span className="lp-line">  <span className="lp-at-success">✓</span> Migration    create_contracts_table.php</span>
                    <span className="lp-line">  <span className="lp-at-success">✓</span> Factory      ContractFactory.php</span>
                    <span className="lp-line">  <span className="lp-at-success">✓</span> Policy       ContractPolicy.php</span>
                    <span className="lp-line">  <span className="lp-at-success">✓</span> Tests        ContractTest.php</span>
                    <span className="lp-line">  <span className="lp-at-success">✓</span> Seeder       UserRoleSeeder.php</span>
                    <span className="lp-line"> </span>
                    <span className="lp-line">  <span className="lp-at-highlight">Done. 6 files generated from YAML — zero AI tokens used.</span></span>
                  </div>
                  <div className="lp-aichat-meta">
                    <a href="#blueprint">See the generated code ↓</a>
                  </div>
                </motion.div>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* ═══════════ BLUEPRINT SHOWCASE ═══════════ */}
        <section className="lp-blueprint-section" id="blueprint">
          <FadeIn>
            <div className="lp-section-header">
              <span className="lp-section-badge">ZERO-TOKEN GENERATION</span>
              <h2>From YAML to production code</h2>
              <p>Define your permission matrix once. Generate policies, tests, and seeders — fully deterministic, no AI needed.</p>
            </div>
          </FadeIn>

          <div className="lp-blueprint-showcase">
            <FadeIn delay={0.1} className="lp-blueprint-col">
              <div className="lp-code-window lp-glow">
                <div className="lp-code-window-bar"><TerminalDots /><span className="lp-file-name">.lumina/blueprints/contracts.yaml</span></div>
                <div className="lp-code-content">
                  <span className="lp-line"><span className="lp-var">model</span>: <span className="lp-cn">Contract</span></span>
                  <span className="lp-line"><span className="lp-var">columns</span>:</span>
                  <span className="lp-line">  <span className="lp-var">title</span>:     {'{'} <span className="lp-var">type</span>: <span className="lp-str">string</span>, <span className="lp-var">filterable</span>: <span className="lp-kw">true</span> {'}'}</span>
                  <span className="lp-line">  <span className="lp-var">total_value</span>: {'{'} <span className="lp-var">type</span>: <span className="lp-str">decimal</span>, <span className="lp-var">nullable</span>: <span className="lp-kw">true</span> {'}'}</span>
                  <span className="lp-line">  <span className="lp-var">status</span>:    {'{'} <span className="lp-var">type</span>: <span className="lp-str">string</span>, <span className="lp-var">default</span>: <span className="lp-str">"draft"</span> {'}'}</span>
                  <span className="lp-line"> </span>
                  <span className="lp-line"><span className="lp-var">permissions</span>:</span>
                  <span className="lp-line">  <span className="lp-var">admin</span>:</span>
                  <span className="lp-line">    <span className="lp-var">actions</span>: [<span className="lp-str">index</span>, <span className="lp-str">show</span>, <span className="lp-str">store</span>, <span className="lp-str">update</span>, <span className="lp-str">destroy</span>]</span>
                  <span className="lp-line">    <span className="lp-var">show_fields</span>: <span className="lp-str">"*"</span></span>
                  <span className="lp-line">    <span className="lp-var">create_fields</span>: [<span className="lp-str">title</span>, <span className="lp-str">total_value</span>, <span className="lp-str">status</span>]</span>
                  <span className="lp-line">    <span className="lp-var">update_fields</span>: [<span className="lp-str">title</span>, <span className="lp-str">status</span>]</span>
                  <span className="lp-line">  <span className="lp-var">viewer</span>:</span>
                  <span className="lp-line">    <span className="lp-var">actions</span>: [<span className="lp-str">index</span>, <span className="lp-str">show</span>]</span>
                  <span className="lp-line">    <span className="lp-var">show_fields</span>: [<span className="lp-str">id</span>, <span className="lp-str">title</span>, <span className="lp-str">status</span>]</span>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.2} className="lp-blueprint-arrow-col">
              <div className="lp-blueprint-flow">
                <code>lumina:blueprint</code>
                <span className="lp-flow-arrow">&#8594;</span>
              </div>
            </FadeIn>

            <FadeIn delay={0.3} className="lp-blueprint-col">
              <div className="lp-code-window lp-glow">
                <div className="lp-code-window-bar"><TerminalDots /><span className="lp-file-name">{BLUEPRINT_FILES[blueprintTab]}</span></div>
                <div className="lp-bp-tabs">
                  {BLUEPRINT_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      className={`lp-bp-tab ${blueprintTab === tab.id ? 'lp-bp-tab--active' : ''}`}
                      onClick={() => setBlueprintTab(tab.id)}>
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="lp-code-content">
                  {blueprintTab === 'policy' && <BlueprintPolicyCode />}
                  {blueprintTab === 'model' && <BlueprintModelCode />}
                  {blueprintTab === 'migration' && <BlueprintMigrationCode />}
                  {blueprintTab === 'tests' && <BlueprintTestCode />}
                </div>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={0.4}>
            <section className="lp-metrics">
              <div className="lp-metric">
                <span className="lp-metric-value">0</span>
                <span className="lp-metric-label">AI tokens used</span>
              </div>
              <div className="lp-metric-sep" />
              <div className="lp-metric">
                <span className="lp-metric-value">15+</span>
                <span className="lp-metric-label">Built-in features</span>
              </div>
              <div className="lp-metric-sep" />
              <div className="lp-metric">
                <span className="lp-metric-value">3</span>
                <span className="lp-metric-label">Frameworks supported</span>
              </div>
            </section>
            <div className="lp-blueprint-files">
              <span className="lp-bf-item"><span className="lp-bf-check">&#10003;</span> Model</span>
              <span className="lp-bf-item"><span className="lp-bf-check">&#10003;</span> Migration</span>
              <span className="lp-bf-item"><span className="lp-bf-check">&#10003;</span> Factory</span>
              <span className="lp-bf-item"><span className="lp-bf-check">&#10003;</span> Policy</span>
              <span className="lp-bf-item"><span className="lp-bf-check">&#10003;</span> Tests</span>
              <span className="lp-bf-item"><span className="lp-bf-check">&#10003;</span> Seeders</span>
            </div>
            <div className="lp-blueprint-link">
              All from YAML — zero AI tokens.{' '}
              <Link to="/docs/server/blueprint">Learn more &#8594;</Link>
            </div>
          </FadeIn>
        </section>

        {/* ═══════════ FEATURES ═══════════ */}
        <section className="lp-features-section" id="features">
          <FadeIn>
            <div className="lp-section-header">
              <span className="lp-section-badge">BUILT-IN</span>
              <h2>Everything you need, out of the box</h2>
              <p>Ship your API in minutes, not days — in any framework</p>
            </div>
          </FadeIn>

          <div className="lp-features-grid">
            {FEATURES.map((f, i) => (
              <FadeIn key={f.cmd} delay={i * 0.05}>
                <div className="lp-feature-card">
                  <div className="lp-card-prompt">
                    <span className="lp-chevron">&#10095;</span>
                    <span className="lp-cmd">{f.cmd}</span>
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                  <span className="lp-feature-tag">{f.tag}</span>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ═══════════ CODE DEMO ═══════════ */}
        <section className="lp-demo-section" id="demo">
          <FadeIn>
            <div className="lp-section-header">
              <span className="lp-section-badge">HOW IT WORKS</span>
              <h2>Register a model, get a full API</h2>
              <p>Same concept, your preferred language</p>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="lp-demo-steps">
              <div className="lp-step">
                <div className="lp-step-badge">1</div>
                <span>Define your model</span>
              </div>
              <div className="lp-step-arrow">&#8594;</div>
              <div className="lp-step">
                <div className="lp-step-badge">2</div>
                <span>Register in config</span>
              </div>
              <div className="lp-step-arrow">&#8594;</div>
              <div className="lp-step">
                <div className="lp-step-badge">3</div>
                <span>Full REST API</span>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <TabbedCodeWindow
              tabs={SERVER_TABS}
              active={serverFw}
              onChange={setServerFw}
              fileName={MODEL_FILES[serverFw]}>
              {serverFw === 'laravel' && <LaravelModelCode />}
              {serverFw === 'rails' && <RailsModelCode />}
              {serverFw === 'adonis' && <AdonisModelCode />}
            </TabbedCodeWindow>
          </FadeIn>

          <FadeIn delay={0.3}>
            <TabbedCodeWindow
              tabs={SERVER_TABS}
              active={serverFw}
              onChange={setServerFw}
              fileName={CONFIG_FILES[serverFw]}>
              {serverFw === 'laravel' && <LaravelConfigCode />}
              {serverFw === 'rails' && <RailsConfigCode />}
              {serverFw === 'adonis' && <AdonisConfigCode />}
            </TabbedCodeWindow>
          </FadeIn>

          <FadeIn delay={0.4}>
            <div className="lp-endpoints-terminal">
              <div className="lp-term-bar"><TerminalDots /><span className="lp-term-title">auto-generated endpoints</span></div>
              <div className="lp-endpoints-content">
                <div className="lp-ep"><span className="lp-m lp-get">GET</span><span className="lp-ep-path">/api/posts</span><span className="lp-ep-desc"># list with filters, sorts, includes</span></div>
                <div className="lp-ep"><span className="lp-m lp-post">POST</span><span className="lp-ep-path">/api/posts</span><span className="lp-ep-desc"># create with validation</span></div>
                <div className="lp-ep"><span className="lp-m lp-get">GET</span><span className="lp-ep-path">/api/posts/{'{id}'}</span><span className="lp-ep-desc"># show with relationships</span></div>
                <div className="lp-ep"><span className="lp-m lp-put">PUT</span><span className="lp-ep-path">/api/posts/{'{id}'}</span><span className="lp-ep-desc"># update with validation</span></div>
                <div className="lp-ep"><span className="lp-m lp-del">DELETE</span><span className="lp-ep-path">/api/posts/{'{id}'}</span><span className="lp-ep-desc"># soft delete</span></div>
                <hr className="lp-ep-sep" />
                <div className="lp-ep"><span className="lp-m lp-get">GET</span><span className="lp-ep-path">/api/posts/trashed</span><span className="lp-ep-desc"># list soft-deleted</span></div>
                <div className="lp-ep"><span className="lp-m lp-post">POST</span><span className="lp-ep-path">/api/posts/{'{id}'}/restore</span><span className="lp-ep-desc"># restore</span></div>
                <div className="lp-ep"><span className="lp-m lp-del">DELETE</span><span className="lp-ep-path">/api/posts/{'{id}'}/force-delete</span><span className="lp-ep-desc"># permanent delete</span></div>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* ═══════════ CTA ═══════════ */}
        <section className="lp-cta-section">
          <FadeIn>
            <h2>Stop writing boilerplate. Start shipping.</h2>
            <p>Install Lumina and ship your API today — in Laravel, Rails, or AdonisJS.</p>
            <div className="lp-cta-buttons">
              <Link className="lp-btn-primary" to="/docs/server/getting-started">
                Read the Docs
              </Link>
              <Link className="lp-btn-secondary" href={GITHUB_URL}>
                &#9733; Star on GitHub
              </Link>
            </div>
          </FadeIn>
        </section>
      </div>
    </Layout>
  );
}
