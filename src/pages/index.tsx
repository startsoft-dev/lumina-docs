import {useState, useEffect, useRef, useCallback} from 'react';
import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import {LaravelIcon, RailsIcon, ReactIcon, AdonisIcon} from '../components/FrameworkIcons';
import './landing.css';

const GITHUB_URL = 'https://github.com/startsoft-dev/lumina-server';

const ASCII_LINES = [
  {text: '  ██╗     ██╗   ██╗███╗   ███╗██╗███╗   ██╗ █████╗ ', color: '#00ffff'},
  {text: '  ██║     ██║   ██║████╗ ████║██║████╗  ██║██╔══██╗', color: '#00e6c8'},
  {text: '  ██║     ██║   ██║██╔████╔██║██║██╔██╗ ██║███████║', color: '#64dc64'},
  {text: '  ██║     ██║   ██║██║╚██╔╝██║██║██║╚██╗██║██╔══██║', color: '#ffdc32'},
  {text: '  ███████╗╚██████╔╝██║ ╚═╝ ██║██║██║ ╚████║██║  ██║', color: '#ffaa1e'},
  {text: '  ╚══════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝', color: '#ff7800'},
];

const FEATURES = [
  {cmd: 'ai', title: 'AI-Native Architecture', desc: 'Declarative, config-driven models that AI agents can read, scaffold, and extend. Built to be prompted, not hand-coded.', tag: 'ai-ready'},
  {cmd: 'crud', title: 'Automatic CRUD API', desc: 'Register a model, get full REST endpoints instantly. Index, show, store, update, delete — zero controller code.', tag: 'zero-boilerplate'},
  {cmd: 'auth', title: 'Built-in Authentication', desc: 'Login, logout, register, password recovery and reset. Token-based auth ready out of the box.', tag: 'security'},
  {cmd: 'policy', title: 'Authorization & Policies', desc: 'Convention-based policies with permission-based access control. Fine-grained resource authorization.', tag: 'access-control'},
  {cmd: 'validate', title: 'Smart Validation', desc: 'Role-based validation rules. Separate rules for store and update. Custom error messages per field.', tag: 'data-integrity'},
  {cmd: 'query', title: 'Advanced Querying', desc: 'Filtering, sorting, search, pagination, field selection, and eager loading — all via query parameters.', tag: 'spatie-query-builder'},
  {cmd: 'softdelete', title: 'Soft Deletes', desc: 'Automatic trash, restore, and force-delete endpoints. Full soft-delete lifecycle managed for you.', tag: 'data-safety'},
  {cmd: 'nested', title: 'Nested Operations', desc: 'Multi-model atomic transactions in a single request. Create parent and children together safely.', tag: 'transactions'},
  {cmd: 'audit', title: 'Audit Trail', desc: 'Automatic change logging for compliance. Track who changed what and when across all resources.', tag: 'compliance'},
  {cmd: 'tenant', title: 'Multi-Tenancy', desc: 'Organization-based data isolation built-in. Subdomain or route-prefix resolution strategies.', tag: 'saas-ready'},
  {cmd: 'generate', title: 'Interactive Generator', desc: 'Scaffold models, migrations, factories, policies, and scopes with a single command in any framework.', tag: 'dx'},
  {cmd: 'postman', title: 'Postman Export', desc: 'Auto-generate a complete Postman Collection v2.1 for all your registered API endpoints.', tag: 'api-testing'},
  {cmd: 'invite', title: 'Invitation System', desc: 'Built-in user invitation workflow with email and acceptance flow. Perfect for team-based apps.', tag: 'collaboration'},
];

type ServerFramework = 'laravel' | 'rails' | 'adonis';
type ClientFramework = 'react' | 'react-native';

type TabDef<T extends string> = {id: T; label: string; icon: React.FC};

const SERVER_TABS: TabDef<ServerFramework>[] = [
  {id: 'laravel', label: 'Laravel', icon: LaravelIcon},
  {id: 'rails', label: 'Rails', icon: RailsIcon},
  {id: 'adonis', label: 'AdonisJS', icon: AdonisIcon},
];

const CLIENT_TABS: TabDef<ClientFramework>[] = [
  {id: 'react', label: 'React', icon: ReactIcon},
  {id: 'react-native', label: 'React Native', icon: ReactIcon},
];

function TerminalDots() {
  return (
    <div className="lp-dots">
      <span style={{background: '#ff5f57'}} />
      <span style={{background: '#febc2e'}} />
      <span style={{background: '#28c840'}} />
    </div>
  );
}

function TypedText({text, speed = 40, delay = 0}: {text: string; speed?: number; delay?: number}) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    if (displayed.length < text.length) {
      const t = setTimeout(() => setDisplayed(text.slice(0, displayed.length + 1)), speed);
      return () => clearTimeout(t);
    }
  }, [displayed, text, speed, started]);

  return (
    <>
      {displayed}
      {displayed.length < text.length && <span className="lp-cursor" />}
    </>
  );
}

function FwTabButton<T extends string>({tab, active, onChange}: {tab: TabDef<T>; active: boolean; onChange: () => void}) {
  return (
    <button
      className={`lp-fw-tab ${active ? 'lp-fw-tab--active' : ''}`}
      onClick={onChange}>
      <tab.icon />
      {tab.label}
    </button>
  );
}

function FrameworkTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef<T>[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="lp-fw-tabs">
      {tabs.map((tab) => (
        <FwTabButton key={tab.id} tab={tab} active={active === tab.id} onChange={() => onChange(tab.id)} />
      ))}
    </div>
  );
}

function TabbedCodeWindow<T extends string>({
  tabs,
  active,
  onChange,
  fileName,
  children,
}: {
  tabs: TabDef<T>[];
  active: T;
  onChange: (id: T) => void;
  fileName: string;
  children: ReactNode;
}) {
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

const GEN_COLUMNS = [
  {name: 'name', type: 'string', rule: 'required'},
  {name: 'price', type: 'decimal(10,2)', rule: 'required'},
  {name: 'description', type: 'text', rule: 'nullable'},
  {name: 'category_id', type: 'foreignId', rule: 'constrained'},
  {name: 'is_active', type: 'boolean', rule: 'default:true'},
];

const GEN_FILES: Record<ServerFramework, {path: string; label: string}[]> = {
  laravel: [
    {path: 'app/Models/Product.php', label: 'Model'},
    {path: 'database/migrations/create_products_table.php', label: 'Migration'},
    {path: 'database/factories/ProductFactory.php', label: 'Factory'},
    {path: 'app/Policies/ProductPolicy.php', label: 'Policy'},
    {path: 'config/lumina.php', label: 'Config updated'},
  ],
  rails: [
    {path: 'app/models/product.rb', label: 'Model'},
    {path: 'db/migrate/create_products.rb', label: 'Migration'},
    {path: 'spec/factories/products.rb', label: 'Factory'},
    {path: 'app/policies/product_policy.rb', label: 'Policy'},
    {path: 'config/initializers/lumina.rb', label: 'Config updated'},
  ],
  adonis: [
    {path: 'app/models/product.ts', label: 'Model'},
    {path: 'database/migrations/create_products.ts', label: 'Migration'},
    {path: 'database/factories/product_factory.ts', label: 'Factory'},
    {path: 'app/policies/product_policy.ts', label: 'Policy'},
    {path: 'config/lumina.ts', label: 'Config updated'},
  ],
};

const GEN_COMMANDS: Record<ServerFramework, string> = {
  laravel: 'php artisan lumina:generate',
  rails: 'rails lumina:generate',
  adonis: 'node ace lumina:generate',
};

const GEN_RESOURCE_OPTIONS = [
  'Model (with migration and factory)',
  'Policy',
  'Scope',
  'Full resource (all files)',
];

type GenScreen = 0 | 1 | 2 | 3 | 4 | 5;

function GeneratorAnimation() {
  const [screen, setScreen] = useState<GenScreen>(0);
  const [optionSelected, setOptionSelected] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [visibleColumns, setVisibleColumns] = useState(0);
  const [fileProgress, setFileProgress] = useState(0);
  const [showDone, setShowDone] = useState(false);
  const [genFramework, setGenFramework] = useState<ServerFramework>('laravel');
  const containerRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hasStartedRef = useRef(false);
  const cycleRef = useRef(0);

  const modelName = 'Product';
  const frameworks: ServerFramework[] = ['laravel', 'rails', 'adonis'];

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
    return t;
  }, []);

  const runAnimation = useCallback(() => {
    clearTimers();
    const fw = frameworks[cycleRef.current % frameworks.length];
    cycleRef.current++;
    setGenFramework(fw);
    setScreen(0);
    setOptionSelected(false);
    setTypedName('');
    setVisibleColumns(0);
    setFileProgress(0);
    setShowDone(false);

    const files = GEN_FILES[fw];
    let t = 0;

    t += 800;
    schedule(() => setScreen(1), t);
    t += 1000;
    schedule(() => setOptionSelected(true), t);
    t += 1000;
    schedule(() => setScreen(2), t);
    for (let i = 0; i < modelName.length; i++) {
      schedule(() => setTypedName(modelName.slice(0, i + 1)), t + 400 + i * 100);
    }
    t += 400 + modelName.length * 100;
    t += 600;
    schedule(() => setScreen(3), t);
    for (let i = 0; i < GEN_COLUMNS.length; i++) {
      schedule(() => setVisibleColumns(i + 1), t + 400 + i * 400);
    }
    t += 400 + GEN_COLUMNS.length * 400;
    t += 600;
    schedule(() => setScreen(4), t);
    t += 1400;
    schedule(() => setScreen(5), t);
    for (let i = 0; i < files.length; i++) {
      schedule(() => setFileProgress(i + 1), t + 600 + i * 400);
    }
    t += 600 + files.length * 400;
    t += 400;
    schedule(() => setShowDone(true), t);
    t += 3500;
    schedule(() => runAnimation(), t);
  }, [clearTimers, schedule]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStartedRef.current) {
          hasStartedRef.current = true;
          runAnimation();
        }
      },
      {threshold: 0.3},
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      clearTimers();
    };
  }, [runAnimation, clearTimers]);

  const files = GEN_FILES[genFramework];
  const cmd = GEN_COMMANDS[genFramework];
  const fwLabel = SERVER_TABS.find((t) => t.id === genFramework)?.label ?? genFramework;

  return (
    <div ref={containerRef} className="lp-generator-window">
      <div className="lp-gen-bar">
        <TerminalDots />
        <span className="lp-term-title">{cmd}</span>
        <span className="lp-gen-fw-badge">{fwLabel}</span>
      </div>
      <div className="lp-gen-stage">
        {screen === 0 && (
          <div className="lp-gen-screen lp-gen-fade" key={`s0-${genFramework}`}>
            <div className="lp-gen-header">+ Lumina :: Generate :: Scaffold your resources +</div>
            <div className="lp-gen-waiting">
              <span className="lp-output-highlight">{'\u25B6'}</span> Initializing generator...
            </div>
          </div>
        )}

        {screen === 1 && (
          <div className="lp-gen-screen lp-gen-fade" key={`s1-${genFramework}`}>
            <div className="lp-gen-header">+ Lumina :: Generate :: Scaffold your resources +</div>
            <div className="lp-gen-label">What type of resource would you like to generate?</div>
            <div className="lp-gen-options">
              {GEN_RESOURCE_OPTIONS.map((opt, i) => (
                <div
                  key={i}
                  className={`lp-gen-option ${i === 0 && optionSelected ? 'lp-gen-option--selected' : ''}`}>
                  <span className="lp-gen-radio">{i === 0 && optionSelected ? '\u25C9' : '\u25CB'}</span>
                  {opt}
                </div>
              ))}
            </div>
          </div>
        )}

        {screen === 2 && (
          <div className="lp-gen-screen lp-gen-fade" key={`s2-${genFramework}`}>
            <div className="lp-gen-header">+ Lumina :: Generate :: Scaffold your resources +</div>
            <div className="lp-gen-breadcrumb">
              <span className="lp-output-success">{'\u2713'}</span> Type: <span className="lp-output-highlight">Model (with migration and factory)</span>
            </div>
            <div className="lp-gen-label">What is the resource name?</div>
            <div className="lp-gen-box">
              {typedName}
              {typedName.length < modelName.length && <span className="lp-cursor" />}
            </div>
          </div>
        )}

        {screen === 3 && (
          <div className="lp-gen-screen lp-gen-fade" key={`s3-${genFramework}`}>
            <div className="lp-gen-header">+ Lumina :: Generate :: Scaffold your resources +</div>
            <div className="lp-gen-breadcrumb">
              <span className="lp-output-success">{'\u2713'}</span> Type: <span className="lp-output-highlight">Model</span>
              {'  '}
              <span className="lp-output-success">{'\u2713'}</span> Name: <span className="lp-output-highlight">Product</span>
            </div>
            <div className="lp-gen-label">Define your columns:</div>
            <div className="lp-gen-columns">
              <div className="lp-gen-col-header">
                <span className="lp-gen-col-name">Column</span>
                <span className="lp-gen-col-type">Type</span>
                <span className="lp-gen-col-rule">Modifier</span>
              </div>
              {GEN_COLUMNS.slice(0, visibleColumns).map((col, i) => (
                <div key={i} className="lp-gen-col-row lp-gen-fade">
                  <span className="lp-gen-col-name"><span className="lp-output-success">+</span> {col.name}</span>
                  <span className="lp-gen-col-type lp-output-highlight">{col.type}</span>
                  <span className="lp-gen-col-rule lp-cm">{col.rule}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {screen === 4 && (
          <div className="lp-gen-screen lp-gen-fade" key={`s4-${genFramework}`}>
            <div className="lp-gen-header">+ Lumina :: Generate :: Scaffold your resources +</div>
            <div className="lp-gen-breadcrumb">
              <span className="lp-output-success">{'\u2713'}</span> Type: <span className="lp-output-highlight">Model</span>
              {'  '}
              <span className="lp-output-success">{'\u2713'}</span> Name: <span className="lp-output-highlight">Product</span>
              {'  '}
              <span className="lp-output-success">{'\u2713'}</span> Columns: <span className="lp-output-highlight">5 defined</span>
            </div>
            <div className="lp-gen-label">Additional options:</div>
            <div className="lp-gen-toggles">
              <div className="lp-gen-toggle"><span className="lp-gen-check lp-output-success">[x]</span> Add soft deletes</div>
              <div className="lp-gen-toggle"><span className="lp-gen-check lp-output-success">[x]</span> Generate policy</div>
              <div className="lp-gen-toggle"><span className="lp-gen-check lp-output-success">[x]</span> Generate factory &amp; seeder</div>
              <div className="lp-gen-toggle"><span className="lp-gen-check lp-cm">[x]</span> Add audit trail</div>
            </div>
          </div>
        )}

        {screen === 5 && (
          <div className="lp-gen-screen lp-gen-fade" key={`s5-${genFramework}`}>
            <div className="lp-gen-header">+ Lumina :: Generate :: Scaffold your resources +</div>
            <div className="lp-gen-status-line">
              <span className="lp-output-highlight">{'\u25B6'}</span> Scaffolding <span className="lp-output-highlight">Product</span> resource...
            </div>
            <div className="lp-gen-divider" />
            {files.slice(0, fileProgress).map((f, i) => (
              <div key={i} className="lp-gen-file-line lp-gen-fade">
                <span className="lp-output-success">{'\u2713'}</span>{' '}
                <span className="lp-cm">{f.label.padEnd(16)}</span>{' '}
                <span style={{color: '#c9d1d9'}}>{f.path}</span>
              </div>
            ))}
            {showDone && (
              <>
                <div className="lp-gen-divider" />
                <div className="lp-gen-done lp-gen-fade">
                  <span className="lp-output-success">{'\u2713'} Done!</span> Product resource scaffolded successfully.
                </div>
                <div className="lp-gen-done-sub lp-gen-fade">
                  5 files created.{' '}
                  {genFramework === 'laravel' && <span>Run <span className="lp-output-highlight">php artisan migrate</span> to apply.</span>}
                  {genFramework === 'rails' && <span>Run <span className="lp-output-highlight">rails db:migrate</span> to apply.</span>}
                  {genFramework === 'adonis' && <span>Run <span className="lp-output-highlight">node ace migration:run</span> to apply.</span>}
                </div>
              </>
            )}
          </div>
        )}
      </div>
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

const INSTALL_COMMANDS: Record<ServerFramework, string> = {
  laravel: 'composer require startsoft/lumina',
  rails: 'bundle add lumina-rails',
  adonis: 'npm install @startsoft/lumina-adonis',
};

const CLIENT_INSTALL_COMMANDS: Record<ClientFramework, string> = {
  react: 'npm install @startsoft/lumina @tanstack/react-query axios',
  'react-native': 'npm install @startsoft/lumina-rn @tanstack/react-query axios',
};

function InstallTab<T extends string>({tab, active, onClick}: {tab: TabDef<T>; active: boolean; onClick: () => void}) {
  return (
    <button className={`lp-install-tab ${active ? 'lp-install-tab--active' : ''}`} onClick={onClick}>
      <tab.icon /> {tab.label}
    </button>
  );
}

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
      <span className="lp-line">  <span className="lp-fn">lumina_validation_rules</span>(</span>
      <span className="lp-line">    <span className="lp-var">title:</span>  <span className="lp-str">'required|string|max:255'</span>,</span>
      <span className="lp-line">    <span className="lp-var">body:</span>   <span className="lp-str">'required|string'</span>,</span>
      <span className="lp-line">    <span className="lp-var">status:</span> <span className="lp-str">'in:draft,published'</span></span>
      <span className="lp-line">  )</span>
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

function LaravelPolicyCode() {
  return (
    <>
      <span className="lp-line"><span className="lp-kw">class</span> <span className="lp-cn">PostPolicy</span> <span className="lp-kw">extends</span> <span className="lp-cn">ResourcePolicy</span></span>
      <span className="lp-line">{'{'}</span>
      <span className="lp-line">    <span className="lp-cm">{"// Convention-based CRUD authorization:"}</span></span>
      <span className="lp-line">    <span className="lp-cm">{"//   viewAny  → checks \"posts.index\""}</span></span>
      <span className="lp-line">    <span className="lp-cm">{"//   create   → checks \"posts.store\""}</span></span>
      <span className="lp-line">    <span className="lp-cm">{"//   update   → checks \"posts.update\""}</span></span>
      <span className="lp-line">    <span className="lp-cm">{"//   delete   → checks \"posts.destroy\""}</span></span>
      <span className="lp-line"> </span>
      <span className="lp-line">    <span className="lp-kw">public function</span> <span className="lp-fn">hiddenColumns</span>(<span className="lp-var">?Authenticatable</span> <span className="lp-var">$user</span>): <span className="lp-cn">array</span></span>
      <span className="lp-line">    {'{'}</span>
      <span className="lp-line">        <span className="lp-kw">if</span> (!<span className="lp-var">$user</span>-&gt;<span className="lp-fn">hasPermission</span>(<span className="lp-str">'posts.*'</span>)) {'{'}</span>
      <span className="lp-line">            <span className="lp-kw">return</span> [<span className="lp-str">'internal_notes'</span>, <span className="lp-str">'revenue'</span>];</span>
      <span className="lp-line">        {'}'}</span>
      <span className="lp-line">        <span className="lp-kw">return</span> [];</span>
      <span className="lp-line">    {'}'}</span>
      <span className="lp-line">{'}'}</span>
    </>
  );
}

function RailsPolicyCode() {
  return (
    <>
      <span className="lp-line"><span className="lp-kw">class</span> <span className="lp-cn">PostPolicy</span> <span className="lp-op">&lt;</span> <span className="lp-cn">Lumina::ResourcePolicy</span></span>
      <span className="lp-line">  <span className="lp-cm"># Convention-based CRUD authorization:</span></span>
      <span className="lp-line">  <span className="lp-cm">#   viewAny  → checks "posts.index"</span></span>
      <span className="lp-line">  <span className="lp-cm">#   create   → checks "posts.store"</span></span>
      <span className="lp-line">  <span className="lp-cm">#   update   → checks "posts.update"</span></span>
      <span className="lp-line">  <span className="lp-cm">#   delete   → checks "posts.destroy"</span></span>
      <span className="lp-line"> </span>
      <span className="lp-line">  <span className="lp-kw">def</span> <span className="lp-fn">hidden_columns</span>(<span className="lp-var">user</span>)</span>
      <span className="lp-line">    <span className="lp-kw">unless</span> <span className="lp-var">user</span>.<span className="lp-fn">has_permission?</span>(<span className="lp-str">'posts.*'</span>)</span>
      <span className="lp-line">      <span className="lp-kw">return</span> [<span className="lp-str">'internal_notes'</span>, <span className="lp-str">'revenue'</span>]</span>
      <span className="lp-line">    <span className="lp-kw">end</span></span>
      <span className="lp-line">    []</span>
      <span className="lp-line">  <span className="lp-kw">end</span></span>
      <span className="lp-line"><span className="lp-kw">end</span></span>
    </>
  );
}

function AdonisPolicyCode() {
  return (
    <>
      <span className="lp-line"><span className="lp-kw">import</span> {'{'} <span className="lp-cn">ResourcePolicy</span> {'}'} <span className="lp-kw">from</span> <span className="lp-str">'@startsoft/lumina-adonis/policies/resource_policy'</span></span>
      <span className="lp-line"> </span>
      <span className="lp-line"><span className="lp-kw">export default class</span> <span className="lp-cn">PostPolicy</span> <span className="lp-kw">extends</span> <span className="lp-cn">ResourcePolicy</span> {'{'}</span>
      <span className="lp-line">  <span className="lp-cm">{"// Convention-based CRUD authorization:"}</span></span>
      <span className="lp-line">  <span className="lp-cm">{"//   viewAny  → checks \"posts.index\""}</span></span>
      <span className="lp-line">  <span className="lp-cm">{"//   create   → checks \"posts.store\""}</span></span>
      <span className="lp-line">  <span className="lp-cm">{"//   update   → checks \"posts.update\""}</span></span>
      <span className="lp-line">  <span className="lp-cm">{"//   delete   → checks \"posts.destroy\""}</span></span>
      <span className="lp-line"> </span>
      <span className="lp-line">  <span className="lp-fn">hiddenColumns</span>(<span className="lp-var">user</span>: <span className="lp-cn">User</span> | <span className="lp-kw">null</span>): <span className="lp-cn">string</span>[] {'{'}</span>
      <span className="lp-line">    <span className="lp-kw">if</span> (!<span className="lp-var">user</span>?.<span className="lp-fn">hasPermission</span>(<span className="lp-str">'posts.*'</span>)) {'{'}</span>
      <span className="lp-line">      <span className="lp-kw">return</span> [<span className="lp-str">'internal_notes'</span>, <span className="lp-str">'revenue'</span>]</span>
      <span className="lp-line">    {'}'}</span>
      <span className="lp-line">    <span className="lp-kw">return</span> []</span>
      <span className="lp-line">  {'}'}</span>
      <span className="lp-line">{'}'}</span>
    </>
  );
}

function ReactClientCode() {
  return (
    <>
      <span className="lp-line"><span className="lp-kw">import</span> {'{'} <span className="lp-fn">useModelIndex</span>, <span className="lp-fn">useModelStore</span> {'}'} <span className="lp-kw">from</span> <span className="lp-str">'@startsoft/lumina'</span></span>
      <span className="lp-line"> </span>
      <span className="lp-line"><span className="lp-kw">function</span> <span className="lp-cn">PostsList</span>() {'{'}</span>
      <span className="lp-line">  <span className="lp-kw">const</span> {'{'} <span className="lp-var">data</span>, <span className="lp-var">isLoading</span> {'}'} = <span className="lp-fn">useModelIndex</span>(<span className="lp-str">'posts'</span>, {'{'}</span>
      <span className="lp-line">    <span className="lp-var">sort</span>: <span className="lp-str">'-created_at'</span>,</span>
      <span className="lp-line">    <span className="lp-var">includes</span>: [<span className="lp-str">'user'</span>],</span>
      <span className="lp-line">    <span className="lp-var">perPage</span>: <span className="lp-num">20</span>,</span>
      <span className="lp-line">  {'}'})</span>
      <span className="lp-line"> </span>
      <span className="lp-line">  <span className="lp-kw">const</span> <span className="lp-var">createPost</span> = <span className="lp-fn">useModelStore</span>(<span className="lp-str">'posts'</span>)</span>
      <span className="lp-line"> </span>
      <span className="lp-line">  <span className="lp-kw">if</span> (<span className="lp-var">isLoading</span>) <span className="lp-kw">return</span> &lt;<span className="lp-cn">Spinner</span> /&gt;</span>
      <span className="lp-line"> </span>
      <span className="lp-line">  <span className="lp-kw">return</span> (</span>
      <span className="lp-line">    &lt;<span className="lp-cn">div</span>&gt;</span>
      <span className="lp-line">      {'{'}data?.data.<span className="lp-fn">map</span>(post =&gt; (</span>
      <span className="lp-line">        &lt;<span className="lp-cn">Card</span> <span className="lp-var">key</span>={'{'}post.id{'}'}&gt;{'{'}post.title{'}'}&lt;/<span className="lp-cn">Card</span>&gt;</span>
      <span className="lp-line">      )){'}'}</span>
      <span className="lp-line">    &lt;/<span className="lp-cn">div</span>&gt;</span>
      <span className="lp-line">  )</span>
      <span className="lp-line">{'}'}</span>
    </>
  );
}

function ReactNativeClientCode() {
  return (
    <>
      <span className="lp-line"><span className="lp-kw">import</span> {'{'} <span className="lp-cn">View</span>, <span className="lp-cn">FlatList</span>, <span className="lp-cn">Text</span> {'}'} <span className="lp-kw">from</span> <span className="lp-str">'react-native'</span></span>
      <span className="lp-line"><span className="lp-kw">import</span> {'{'} <span className="lp-fn">useModelIndex</span>, <span className="lp-fn">useModelStore</span> {'}'} <span className="lp-kw">from</span> <span className="lp-str">'@startsoft/lumina-rn'</span></span>
      <span className="lp-line"> </span>
      <span className="lp-line"><span className="lp-kw">function</span> <span className="lp-cn">PostsScreen</span>() {'{'}</span>
      <span className="lp-line">  <span className="lp-kw">const</span> {'{'} <span className="lp-var">data</span>, <span className="lp-var">isLoading</span> {'}'} = <span className="lp-fn">useModelIndex</span>(<span className="lp-str">'posts'</span>, {'{'}</span>
      <span className="lp-line">    <span className="lp-var">sort</span>: <span className="lp-str">'-created_at'</span>,</span>
      <span className="lp-line">    <span className="lp-var">perPage</span>: <span className="lp-num">20</span>,</span>
      <span className="lp-line">  {'}'})</span>
      <span className="lp-line"> </span>
      <span className="lp-line">  <span className="lp-kw">const</span> <span className="lp-var">createPost</span> = <span className="lp-fn">useModelStore</span>(<span className="lp-str">'posts'</span>)</span>
      <span className="lp-line"> </span>
      <span className="lp-line">  <span className="lp-kw">return</span> (</span>
      <span className="lp-line">    &lt;<span className="lp-cn">View</span> <span className="lp-var">style</span>={'{'}{'{'} <span className="lp-var">flex</span>: <span className="lp-num">1</span> {'}'}{'}'}{'&gt;'}</span>
      <span className="lp-line">      &lt;<span className="lp-cn">FlatList</span></span>
      <span className="lp-line">        <span className="lp-var">data</span>={'{'}data?.data{'}'}</span>
      <span className="lp-line">        <span className="lp-var">keyExtractor</span>={'{'}<span className="lp-var">item</span> =&gt; String(item.id){'}'}</span>
      <span className="lp-line">        <span className="lp-var">renderItem</span>={'{'}({'{'} <span className="lp-var">item</span> {'}'}) =&gt; (</span>
      <span className="lp-line">          &lt;<span className="lp-cn">Text</span>&gt;{'{'}item.title{'}'}&lt;/<span className="lp-cn">Text</span>&gt;</span>
      <span className="lp-line">        ){'}'}</span>
      <span className="lp-line">      /&gt;</span>
      <span className="lp-line">    &lt;/<span className="lp-cn">View</span>&gt;</span>
      <span className="lp-line">  )</span>
      <span className="lp-line">{'}'}</span>
    </>
  );
}

const CONFIG_FILES: Record<ServerFramework, string> = {
  laravel: 'config/lumina.php',
  rails: 'config/initializers/lumina.rb',
  adonis: 'config/lumina.ts',
};

const POLICY_FILES: Record<ServerFramework, string> = {
  laravel: 'app/Policies/PostPolicy.php',
  rails: 'app/policies/post_policy.rb',
  adonis: 'app/policies/post_policy.ts',
};

const MODEL_FILES: Record<ServerFramework, string> = {
  laravel: 'app/Models/Post.php',
  rails: 'app/models/post.rb',
  adonis: 'app/models/post.ts',
};

export default function Home(): ReactNode {
  const [serverFw, setServerFw] = useState<ServerFramework>('laravel');
  const [clientFw, setClientFw] = useState<ClientFramework>('react');
  const [policyFw, setPolicyFw] = useState<ServerFramework>('laravel');
  const [installFw, setInstallFw] = useState<ServerFramework>('laravel');
  const [installClientFw, setInstallClientFw] = useState<ClientFramework>('react');

  return (
    <Layout
      title="Automatic REST API for Laravel, Rails & AdonisJS"
      description="Lumina — automatic REST API generation for Laravel, Rails, and AdonisJS. React & React Native client included. Built for the AI era.">
      <div className="lp">
        {/* Hero */}
        <section className="lp-hero">
          <div className="lp-ascii-logo" aria-label="LUMINA">
            {ASCII_LINES.map((line, i) => (
              <span key={i} style={{display: 'block', color: line.color}}>{line.text}</span>
            ))}
          </div>

          <div className="lp-hero-prompt">
            <span className="lp-prompt-symbol">&#10095;</span>
            <span className="lp-prompt-path">~/my-app</span>
            <span className="lp-prompt-text">
              <TypedText text="composer require startsoft/lumina" speed={35} delay={500} />
            </span>
          </div>

          <div className="lp-hero-output">
            <div className="lp-output-line">
              <span className="lp-output-success">&#10003;</span> Package installed successfully.
            </div>
            <div className="lp-output-line">
              <span className="lp-output-highlight">&#9656;</span> Your REST API is ready.
            </div>
          </div>

          <h1 className="lp-hero-tagline">Built for the AI era.</h1>
          <p className="lp-hero-description">
            The API framework AI agents can scaffold, understand, and extend.
            Automatic REST generation for <strong>Laravel</strong>, <strong>Rails</strong>, and <strong>AdonisJS</strong> with
            first-class <strong>React</strong> and <strong>React Native</strong> clients — designed to be prompted, not hand-coded.
          </p>

          <div className="lp-framework-logos">
            <span className="lp-fw-logo"><LaravelIcon /> Laravel</span>
            <span className="lp-fw-logo-sep">/</span>
            <span className="lp-fw-logo"><RailsIcon /> Rails</span>
            <span className="lp-fw-logo-sep">/</span>
            <span className="lp-fw-logo"><AdonisIcon /> AdonisJS</span>
            <span className="lp-fw-logo-sep">+</span>
            <span className="lp-fw-logo"><ReactIcon /> React</span>
            <span className="lp-fw-logo-sep">/</span>
            <span className="lp-fw-logo"><ReactIcon /> React Native</span>
          </div>

          <div className="lp-hero-buttons">
            <Link className="lp-btn-primary" to="/docs/server/getting-started">
              &#9656; Get Started
            </Link>
            <Link className="lp-btn-secondary" href={GITHUB_URL}>
              &#9733; Star on GitHub
            </Link>
          </div>
        </section>

        {/* Install */}
        <section className="lp-install-section">
          <div className="lp-install-group">
            <div className="lp-install-label">Server</div>
            <div className="lp-install-tabs">
              {SERVER_TABS.map((t) => (
                <InstallTab key={t.id} tab={t} active={installFw === t.id} onClick={() => setInstallFw(t.id)} />
              ))}
            </div>
            <div className="lp-install-box">
              <span className="lp-dollar">$</span>
              <code>{INSTALL_COMMANDS[installFw]}</code>
              <CopyButton text={INSTALL_COMMANDS[installFw]} />
            </div>
          </div>
          <div className="lp-install-group" style={{marginTop: 24}}>
            <div className="lp-install-label">Client</div>
            <div className="lp-install-tabs">
              {CLIENT_TABS.map((t) => (
                <InstallTab key={t.id} tab={t} active={installClientFw === t.id} onClick={() => setInstallClientFw(t.id)} />
              ))}
            </div>
            <div className="lp-install-box">
              <span className="lp-dollar">$</span>
              <code>{CLIENT_INSTALL_COMMANDS[installClientFw]}</code>
              <CopyButton text={CLIENT_INSTALL_COMMANDS[installClientFw]} />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="lp-features-section" id="features">
          <div className="lp-section-header">
            <div className="lp-prompt-line">
              <span className="lp-prompt-symbol">&#10095;</span>
              <span className="lp-prompt-text">lumina --list-features</span>
            </div>
            <h2>Everything you need, built-in</h2>
            <p>Ship your API in minutes, not days — in any framework</p>
          </div>
          <div className="lp-features-grid">
            {FEATURES.map((f) => (
              <div className="lp-feature-card" key={f.cmd}>
                <div className="lp-card-prompt">
                  <span className="lp-chevron">&#10095;</span>
                  <span className="lp-cmd">{f.cmd}</span>
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <span className="lp-feature-tag">{f.tag}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Code Demo — Server Model */}
        <section className="lp-demo-section" id="demo">
          <div className="lp-section-header">
            <div className="lp-prompt-line">
              <span className="lp-prompt-symbol">&#10095;</span>
              <span className="lp-prompt-text">cat models/Post</span>
            </div>
            <h2>Register a model, get a full API</h2>
            <p>Same concept, your preferred language</p>
          </div>

          <TabbedCodeWindow
            tabs={SERVER_TABS}
            active={serverFw}
            onChange={setServerFw}
            fileName={MODEL_FILES[serverFw]}>
            {serverFw === 'laravel' && <LaravelModelCode />}
            {serverFw === 'rails' && <RailsModelCode />}
            {serverFw === 'adonis' && <AdonisModelCode />}
          </TabbedCodeWindow>

          <TabbedCodeWindow
            tabs={SERVER_TABS}
            active={serverFw}
            onChange={setServerFw}
            fileName={CONFIG_FILES[serverFw]}>
            {serverFw === 'laravel' && <LaravelConfigCode />}
            {serverFw === 'rails' && <RailsConfigCode />}
            {serverFw === 'adonis' && <AdonisConfigCode />}
          </TabbedCodeWindow>
        </section>

        {/* Endpoints */}
        <section className="lp-endpoints-section" id="endpoints">
          <div className="lp-section-header">
            <div className="lp-prompt-line">
              <span className="lp-prompt-symbol">&#10095;</span>
              <span className="lp-prompt-text">lumina routes --resource=posts</span>
            </div>
            <h2>Auto-generated endpoints</h2>
            <p>All of these come free, for every registered model — regardless of framework</p>
          </div>
          <div className="lp-endpoints-terminal">
            <div className="lp-term-bar"><TerminalDots /><span className="lp-term-title">api routes</span></div>
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
              <hr className="lp-ep-sep" />
              <div className="lp-ep"><span className="lp-m lp-post">POST</span><span className="lp-ep-path">/api/auth/login</span><span className="lp-ep-desc"># authenticate</span></div>
              <div className="lp-ep"><span className="lp-m lp-post">POST</span><span className="lp-ep-path">/api/auth/register</span><span className="lp-ep-desc"># register</span></div>
              <div className="lp-ep"><span className="lp-m lp-post">POST</span><span className="lp-ep-path">/api/auth/logout</span><span className="lp-ep-desc"># logout</span></div>
            </div>
          </div>
        </section>

        {/* Policies */}
        <section className="lp-demo-section" id="policies">
          <div className="lp-section-header">
            <div className="lp-prompt-line">
              <span className="lp-prompt-symbol">&#10095;</span>
              <span className="lp-prompt-text">cat policies/PostPolicy</span>
            </div>
            <h2>Role-based authorization, built-in</h2>
            <p>Convention-based policies with wildcard permissions and org-scoping</p>
          </div>

          <TabbedCodeWindow
            tabs={SERVER_TABS}
            active={policyFw}
            onChange={setPolicyFw}
            fileName={POLICY_FILES[policyFw]}>
            {policyFw === 'laravel' && <LaravelPolicyCode />}
            {policyFw === 'rails' && <RailsPolicyCode />}
            {policyFw === 'adonis' && <AdonisPolicyCode />}
          </TabbedCodeWindow>

          <div className="lp-code-window" style={{marginTop: 20}}>
            <div className="lp-code-window-bar"><TerminalDots /><span className="lp-file-name">roles &amp; permissions</span></div>
            <div className="lp-code-content">
              <span className="lp-line"><span className="lp-cm"># Permission format: {'{resource}'}.{'{action}'}</span></span>
              <span className="lp-line"> </span>
              <span className="lp-line"><span className="lp-var">admin</span>    → <span className="lp-str">"*"</span>                 <span className="lp-cm"># full access to everything</span></span>
              <span className="lp-line"><span className="lp-var">editor</span>   → <span className="lp-str">"posts.*"</span>            <span className="lp-cm"># all actions on posts</span></span>
              <span className="lp-line"><span className="lp-var">viewer</span>   → <span className="lp-str">"posts.index"</span>, <span className="lp-str">"posts.show"</span>  <span className="lp-cm"># read-only</span></span>
              <span className="lp-line"><span className="lp-var">writer</span>   → <span className="lp-str">"posts.store"</span>, <span className="lp-str">"posts.update"</span> <span className="lp-cm"># create &amp; edit</span></span>
            </div>
          </div>
        </section>

        {/* Client SDK */}
        <section className="lp-demo-section" id="client">
          <div className="lp-section-header">
            <div className="lp-prompt-line">
              <span className="lp-prompt-symbol">&#10095;</span>
              <span className="lp-prompt-text">cat components/PostsList</span>
            </div>
            <h2>First-class client SDKs</h2>
            <p>Type-safe hooks for React and React Native — works with any Lumina backend</p>
          </div>

          <TabbedCodeWindow
            tabs={CLIENT_TABS}
            active={clientFw}
            onChange={setClientFw}
            fileName={clientFw === 'react' ? 'src/components/PostsList.tsx' : 'src/screens/PostsScreen.tsx'}>
            {clientFw === 'react' && <ReactClientCode />}
            {clientFw === 'react-native' && <ReactNativeClientCode />}
          </TabbedCodeWindow>
        </section>

        {/* Generator */}
        <section className="lp-generator-section">
          <div className="lp-section-header">
            <div className="lp-prompt-line">
              <span className="lp-prompt-symbol">&#10095;</span>
              <span className="lp-prompt-text">lumina:generate</span>
            </div>
            <h2>Interactive scaffolding</h2>
            <p>Generate models, migrations, factories, policies, and scopes — in Laravel, Rails, or AdonisJS</p>
          </div>
          <GeneratorAnimation />
        </section>

        {/* Query Examples */}
        <section className="lp-demo-section">
          <div className="lp-section-header">
            <div className="lp-prompt-line">
              <span className="lp-prompt-symbol">&#10095;</span>
              <span className="lp-prompt-text">curl /api/posts?...</span>
            </div>
            <h2>Powerful querying, out of the box</h2>
            <p>Filter, sort, include, search — all via query parameters. Same API surface, every framework.</p>
          </div>
          <div className="lp-code-window">
            <div className="lp-code-window-bar"><TerminalDots /><span className="lp-file-name">terminal</span></div>
            <div className="lp-code-content">
              <span className="lp-line"><span className="lp-cm"># Filter by status</span></span>
              <span className="lp-line"><span className="lp-kw">GET</span> <span className="lp-str">/api/posts?filter[status]=published</span></span>
              <span className="lp-line"> </span>
              <span className="lp-line"><span className="lp-cm"># Sort descending by date</span></span>
              <span className="lp-line"><span className="lp-kw">GET</span> <span className="lp-str">/api/posts?sort=-created_at</span></span>
              <span className="lp-line"> </span>
              <span className="lp-line"><span className="lp-cm"># Eager load relationships</span></span>
              <span className="lp-line"><span className="lp-kw">GET</span> <span className="lp-str">/api/posts?include=user,comments</span></span>
              <span className="lp-line"> </span>
              <span className="lp-line"><span className="lp-cm"># Combine everything</span></span>
              <span className="lp-line"><span className="lp-kw">GET</span> <span className="lp-str">/api/posts?filter[status]=published&amp;sort=-created_at&amp;include=user&amp;per_page=20</span></span>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="lp-cta-section">
          <h2>Stop writing boilerplate.</h2>
          <p>Install Lumina and ship your API today — in Laravel, Rails, or AdonisJS.</p>
          <div className="lp-cta-buttons">
            <Link className="lp-btn-primary" to="/docs/server/getting-started">
              Read the Docs
            </Link>
            <Link className="lp-btn-secondary" href={GITHUB_URL}>
              &#9733; Star on GitHub
            </Link>
          </div>
        </section>
      </div>
    </Layout>
  );
}
