import {useState, useEffect, useRef, useCallback} from 'react';
import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
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
  {cmd: 'policy', title: 'Authorization & Policies', desc: 'Laravel Policy integration with permission-based access control. Fine-grained resource authorization.', tag: 'access-control'},
  {cmd: 'validate', title: 'Smart Validation', desc: 'Role-based validation rules. Separate rules for store and update. Custom error messages per field.', tag: 'data-integrity'},
  {cmd: 'query', title: 'Advanced Querying', desc: 'Filtering, sorting, search, pagination, field selection, and eager loading — all via query parameters.', tag: 'spatie-query-builder'},
  {cmd: 'softdelete', title: 'Soft Deletes', desc: 'Automatic trash, restore, and force-delete endpoints. Full soft-delete lifecycle managed for you.', tag: 'data-safety'},
  {cmd: 'nested', title: 'Nested Operations', desc: 'Multi-model atomic transactions in a single request. Create parent and children together safely.', tag: 'transactions'},
  {cmd: 'audit', title: 'Audit Trail', desc: 'Automatic change logging for compliance. Track who changed what and when across all resources.', tag: 'compliance'},
  {cmd: 'tenant', title: 'Multi-Tenancy', desc: 'Organization-based data isolation built-in. Subdomain or route-prefix resolution strategies.', tag: 'saas-ready'},
  {cmd: 'generate', title: 'Interactive Generator', desc: 'Scaffold models, migrations, factories, policies, and scopes with a single artisan command.', tag: 'dx'},
  {cmd: 'postman', title: 'Postman Export', desc: 'Auto-generate a complete Postman Collection v2.1 for all your registered API endpoints.', tag: 'api-testing'},
  {cmd: 'invite', title: 'Invitation System', desc: 'Built-in user invitation workflow with email and acceptance flow. Perfect for team-based apps.', tag: 'collaboration'},
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

// Generator animation — screen-based (fixed height container)
const GEN_COLUMNS = [
  {name: 'name', type: 'string', rule: 'required'},
  {name: 'price', type: 'decimal(10,2)', rule: 'required'},
  {name: 'description', type: 'text', rule: 'nullable'},
  {name: 'category_id', type: 'foreignId', rule: 'constrained'},
  {name: 'is_active', type: 'boolean', rule: 'default:true'},
];

const GEN_FILES = [
  {path: 'app/Models/Product.php', label: 'Model'},
  {path: 'database/migrations/create_products_table.php', label: 'Migration'},
  {path: 'database/factories/ProductFactory.php', label: 'Factory'},
  {path: 'app/Policies/ProductPolicy.php', label: 'Policy'},
  {path: 'config/lumina.php', label: 'Config updated'},
];

const GEN_RESOURCE_OPTIONS = [
  'Model (with migration and factory)',
  'Policy',
  'Scope',
  'Full resource (all files)',
];

// Screens: 0=header, 1=resource type, 2=name, 3=columns, 4=toggles, 5=scaffolding+files
type GenScreen = 0 | 1 | 2 | 3 | 4 | 5;

function GeneratorAnimation() {
  const [screen, setScreen] = useState<GenScreen>(0);
  const [optionSelected, setOptionSelected] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [visibleColumns, setVisibleColumns] = useState(0);
  const [fileProgress, setFileProgress] = useState(0);
  const [showDone, setShowDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hasStartedRef = useRef(false);

  const modelName = 'Product';

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
    setScreen(0);
    setOptionSelected(false);
    setTypedName('');
    setVisibleColumns(0);
    setFileProgress(0);
    setShowDone(false);

    let t = 0;

    // Screen 0: header
    // Screen 1: resource type question
    t += 800;
    schedule(() => setScreen(1), t);
    // Highlight selection
    t += 1000;
    schedule(() => setOptionSelected(true), t);
    // Transition to screen 2: name input
    t += 1000;
    schedule(() => setScreen(2), t);
    // Type model name
    for (let i = 0; i < modelName.length; i++) {
      schedule(() => setTypedName(modelName.slice(0, i + 1)), t + 400 + i * 100);
    }
    t += 400 + modelName.length * 100;
    // Transition to screen 3: columns
    t += 600;
    schedule(() => setScreen(3), t);
    // Columns appear one by one
    for (let i = 0; i < GEN_COLUMNS.length; i++) {
      schedule(() => setVisibleColumns(i + 1), t + 400 + i * 400);
    }
    t += 400 + GEN_COLUMNS.length * 400;
    // Transition to screen 4: toggles
    t += 600;
    schedule(() => setScreen(4), t);
    // Transition to screen 5: scaffolding
    t += 1400;
    schedule(() => setScreen(5), t);
    // Files appear one by one
    for (let i = 0; i < GEN_FILES.length; i++) {
      schedule(() => setFileProgress(i + 1), t + 600 + i * 400);
    }
    t += 600 + GEN_FILES.length * 400;
    // Show done
    t += 400;
    schedule(() => setShowDone(true), t);
    // Restart loop
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

  return (
    <div ref={containerRef} className="lp-generator-window">
      <div className="lp-gen-bar">
        <TerminalDots />
        <span className="lp-term-title">php artisan lumina:generate</span>
      </div>
      <div className="lp-gen-stage">
        {/* Screen 0: Header only */}
        {screen === 0 && (
          <div className="lp-gen-screen lp-gen-fade" key="s0">
            <div className="lp-gen-header">
              + Lumina :: Generate :: Scaffold your resources +
            </div>
            <div className="lp-gen-waiting">
              <span className="lp-output-highlight">{'\u25B6'}</span> Initializing generator...
            </div>
          </div>
        )}

        {/* Screen 1: Resource type selection */}
        {screen === 1 && (
          <div className="lp-gen-screen lp-gen-fade" key="s1">
            <div className="lp-gen-header">
              + Lumina :: Generate :: Scaffold your resources +
            </div>
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

        {/* Screen 2: Resource name */}
        {screen === 2 && (
          <div className="lp-gen-screen lp-gen-fade" key="s2">
            <div className="lp-gen-header">
              + Lumina :: Generate :: Scaffold your resources +
            </div>
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

        {/* Screen 3: Define columns */}
        {screen === 3 && (
          <div className="lp-gen-screen lp-gen-fade" key="s3">
            <div className="lp-gen-header">
              + Lumina :: Generate :: Scaffold your resources +
            </div>
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

        {/* Screen 4: Feature toggles */}
        {screen === 4 && (
          <div className="lp-gen-screen lp-gen-fade" key="s4">
            <div className="lp-gen-header">
              + Lumina :: Generate :: Scaffold your resources +
            </div>
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

        {/* Screen 5: Scaffolding + file output */}
        {screen === 5 && (
          <div className="lp-gen-screen lp-gen-fade" key="s5">
            <div className="lp-gen-header">
              + Lumina :: Generate :: Scaffold your resources +
            </div>
            <div className="lp-gen-status-line">
              <span className="lp-output-highlight">{'\u25B6'}</span> Scaffolding <span className="lp-output-highlight">Product</span> resource...
            </div>
            <div className="lp-gen-divider" />
            {GEN_FILES.slice(0, fileProgress).map((f, i) => (
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
                  5 files created. Run <span className="lp-output-highlight">php artisan migrate</span> to apply.
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

export default function Home(): ReactNode {
  return (
    <Layout
      title="Automatic REST API for Laravel"
      description="Lumina — automatic REST API generation for Laravel. Built for the AI era.">
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
            Automatic REST generation for Laravel with zero boilerplate — designed
            to be prompted, not hand-coded.
          </p>

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
          <div className="lp-install-box">
            <span className="lp-dollar">$</span>
            <code>composer require startsoft/lumina</code>
            <CopyButton text="composer require startsoft/lumina" />
          </div>
          <div className="lp-install-box" style={{marginTop: 12}}>
            <span className="lp-dollar">$</span>
            <code>npm install lumina-laravel</code>
            <CopyButton text="npm install lumina-laravel" />
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
            <p>Ship your API in minutes, not days</p>
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

        {/* Code Demo */}
        <section className="lp-demo-section" id="demo">
          <div className="lp-section-header">
            <div className="lp-prompt-line">
              <span className="lp-prompt-symbol">&#10095;</span>
              <span className="lp-prompt-text">cat app/Models/Post.php</span>
            </div>
            <h2>Register a model, get a full API</h2>
            <p>This is all you need to write</p>
          </div>

          <div className="lp-code-window">
            <div className="lp-code-window-bar">
              <TerminalDots />
              <span className="lp-file-name">app/Models/Post.php</span>
            </div>
            <div className="lp-code-content">
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
            </div>
          </div>

          <div className="lp-code-window" style={{marginTop: 20}}>
            <div className="lp-code-window-bar">
              <TerminalDots />
              <span className="lp-file-name">config/lumina.php</span>
            </div>
            <div className="lp-code-content">
              <span className="lp-line"><span className="lp-kw">return</span> [</span>
              <span className="lp-line">    <span className="lp-str">'models'</span> <span className="lp-op">=&gt;</span> [</span>
              <span className="lp-line">        <span className="lp-str">'posts'</span> <span className="lp-op">=&gt;</span> \App\Models\<span className="lp-cn">Post</span>::<span className="lp-kw">class</span>,</span>
              <span className="lp-line">    ],</span>
              <span className="lp-line">];</span>
            </div>
          </div>
        </section>

        {/* Endpoints */}
        <section className="lp-endpoints-section" id="endpoints">
          <div className="lp-section-header">
            <div className="lp-prompt-line">
              <span className="lp-prompt-symbol">&#10095;</span>
              <span className="lp-prompt-text">php artisan route:list --path=api/posts</span>
            </div>
            <h2>Auto-generated endpoints</h2>
            <p>All of these come free, for every registered model</p>
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
              <span className="lp-prompt-text">cat app/Policies/PostPolicy.php</span>
            </div>
            <h2>Role-based authorization, built-in</h2>
            <p>Convention-based policies with wildcard permissions and org-scoping</p>
          </div>

          <div className="lp-code-window">
            <div className="lp-code-window-bar"><TerminalDots /><span className="lp-file-name">app/Policies/PostPolicy.php</span></div>
            <div className="lp-code-content">
              <span className="lp-line"><span className="lp-kw">class</span> <span className="lp-cn">PostPolicy</span> <span className="lp-kw">extends</span> <span className="lp-cn">ResourcePolicy</span></span>
              <span className="lp-line">{'{'}</span>
              <span className="lp-line">    <span className="lp-cm">{"// That's it. Convention-based CRUD authorization:"}</span></span>
              <span className="lp-line">    <span className="lp-cm">{"//   viewAny  → checks \"posts.index\""}</span></span>
              <span className="lp-line">    <span className="lp-cm">{"//   create   → checks \"posts.store\""}</span></span>
              <span className="lp-line">    <span className="lp-cm">{"//   update   → checks \"posts.update\""}</span></span>
              <span className="lp-line">    <span className="lp-cm">{"//   delete   → checks \"posts.destroy\""}</span></span>
              <span className="lp-line"> </span>
              <span className="lp-line">    <span className="lp-cm">{"// Override for custom logic:"}</span></span>
              <span className="lp-line">    <span className="lp-kw">public function</span> <span className="lp-fn">hiddenColumns</span>(<span className="lp-var">?Authenticatable</span> <span className="lp-var">$user</span>): <span className="lp-cn">array</span></span>
              <span className="lp-line">    {'{'}</span>
              <span className="lp-line">        <span className="lp-cm">{"// Hide sensitive fields from non-admins"}</span></span>
              <span className="lp-line">        <span className="lp-kw">if</span> (!<span className="lp-var">$user</span>-&gt;<span className="lp-fn">hasPermission</span>(<span className="lp-str">'posts.*'</span>)) {'{'}</span>
              <span className="lp-line">            <span className="lp-kw">return</span> [<span className="lp-str">'internal_notes'</span>, <span className="lp-str">'revenue'</span>];</span>
              <span className="lp-line">        {'}'}</span>
              <span className="lp-line">        <span className="lp-kw">return</span> [];</span>
              <span className="lp-line">    {'}'}</span>
              <span className="lp-line">{'}'}</span>
            </div>
          </div>

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

          <div className="lp-code-window" style={{marginTop: 20}}>
            <div className="lp-code-window-bar"><TerminalDots /><span className="lp-file-name">terminal — authorization in action</span></div>
            <div className="lp-code-content">
              <span className="lp-line"><span className="lp-cm"># Admin — full access</span></span>
              <span className="lp-line"><span className="lp-kw">$</span> <span className="lp-str">curl -H "Authorization: Bearer ADMIN_TOKEN" /api/acme/posts</span></span>
              <span className="lp-line"><span className="lp-cn">→ 200</span> [{'{'}...{'}'}]</span>
              <span className="lp-line"> </span>
              <span className="lp-line"><span className="lp-cm"># Viewer — tries to create → denied</span></span>
              <span className="lp-line"><span className="lp-kw">$</span> <span className="lp-str">curl -X POST -d '{'"title":"Hello"'}' /api/acme/posts</span></span>
              <span className="lp-line"><span className="lp-op">→ 403</span> {'{'} <span className="lp-str">"message"</span>: <span className="lp-str">"This action is unauthorized."</span> {'}'}</span>
              <span className="lp-line"> </span>
              <span className="lp-line"><span className="lp-cm"># Multi-tenant — scoped per organization</span></span>
              <span className="lp-line"><span className="lp-kw">$</span> <span className="lp-str">curl /api/other-co/posts</span></span>
              <span className="lp-line"><span className="lp-op">→ 404</span> {'{'} <span className="lp-str">"message"</span>: <span className="lp-str">"Not found."</span> {'}'} <span className="lp-cm"># not a member</span></span>
            </div>
          </div>
        </section>

        {/* Generator */}
        <section className="lp-generator-section">
          <div className="lp-section-header">
            <div className="lp-prompt-line">
              <span className="lp-prompt-symbol">&#10095;</span>
              <span className="lp-prompt-text">php artisan lumina:generate</span>
            </div>
            <h2>Interactive scaffolding</h2>
            <p>Generate models, migrations, factories, policies, and scopes interactively</p>
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
            <p>Filter, sort, include, search — all via query parameters</p>
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
          <p>Install Lumina and ship your Laravel API today.</p>
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
