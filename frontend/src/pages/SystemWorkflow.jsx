import { useRole, ROLES } from '../context/RoleContext';
import { useAuth } from '../context/AuthContext';
import { Shield, Map, Award, UserCheck, ArrowDown, Database, Server, Cloud, Monitor, RefreshCw, FileText } from 'lucide-react';
import './SystemWorkflow.css';

// The path every number takes, from the accountant's entry in Tally to the screen.
const FLOW = [
  {
    icon: FileText,
    title: '1. Tally Prime',
    where: 'Runs on the company VM',
    what: 'The accounts team enters invoices, credit notes, receipts and ledgers here. Tally is the source of truth; the dashboard never changes anything in it.',
    why: 'This is where the real business happens, so every figure is traced back to it.',
  },
  {
    icon: RefreshCw,
    title: '2. Sync service (tallybackend)',
    where: 'Node.js, on the same VM',
    what: 'Asks Tally for new vouchers about every 10 minutes and for masters (dealers, items) once a day. Looks up each dealer’s pincode to find its district and city.',
    why: 'Tally cannot serve many dashboard users at once. Copying the data out keeps Tally fast and safe.',
  },
  {
    icon: Database,
    title: '3. PostgreSQL database',
    where: 'On the VM (wallnut_sync)',
    what: 'Holds the copy: vouchers and item lines, dealer ledgers with pincode, pending bills, e-Way bills, plus this app’s own tables (logins, sales calls).',
    why: 'One organised place to read from, with every financial year together.',
  },
  {
    icon: Server,
    title: '4. Wallnut API',
    where: 'Node.js on AWS (EC2), kept running by PM2',
    what: 'Only reads the database. Applies the business rules: sales are taken from Tally’s Sales ledger postings (credit notes subtract), Branch Transfer and Sample invoices are kept out of sales, a dealer’s State / District / City come from its pincode. Also checks logins.',
    why: 'Rules are applied once, in one place, so every dashboard shows the same numbers.',
  },
  {
    icon: Monitor,
    title: '5. Dashboard',
    where: 'React app on Vercel (your browser)',
    what: 'Shows the figures. Filters (date range, State → District → City, Sales Officer, Dealer) and role limits are applied here, then totals, charts and lists are worked out from the rows.',
    why: 'Fast to use: changing a filter updates every card, chart and table at once.',
  },
];

// Short answers to "where does this number come from?"
const NUMBERS = [
  ['Net Sales (Excl. GST)', 'Same as Tally’s Sales: after discount, without GST; credit notes are subtracted. Branch Transfer and Sample are not included.'],
  ['Active Dealers', 'Customers with a sales invoice or credit note in the period.'],
  ['Outstanding', 'Pending bills in Tally for invoices of the period.'],
  ['State / District / City', 'From the dealer’s pincode on its Tally ledger (not from the plant or godown the goods left from). Dealers with no pincode show as Unknown.'],
  ['Percentages', 'Hover the ⓘ next to a heading to see exactly how that % is worked out.'],
  ['Sales Officer', 'Taken from the invoice lines in Tally where it is filled in; most invoices do not carry it yet, so officer-wise figures are incomplete until it is captured in Tally.'],
];

const GOOD_TO_KNOW = [
  'Tally → database is copied about every 10 minutes. The dashboard keeps a short 2-minute copy of the data; the Sync button fetches fresh data.',
  'Complaints entered in the dashboard are kept in that browser for now; daily sales calls are saved in the database.',
  'Target % has no real targets behind it yet (it is an assumed target) – see the ⓘ on that column.',
  'Each login has one role. Only the CEO can create users and choose which state(s) or district they see.',
];

export default function SystemWorkflow() {
  const { currentRole, setRole } = useRole();
  const { currentUser } = useAuth();

  const nodes = [
    {
      id: ROLES.CEO,
      icon: Shield,
      title: 'CEO / Admin',
      scope: 'All India',
      features: [
        'Whole-company dashboard: Net Sales, Active Dealers, Outstanding – click any card for the dealer / invoice / bill list',
        'Filters: Financial Year, date range, State → District → City, Sales Officer, Dealer',
        'Map, state and district performance, products & officers, dealers, sales breakdown vs Tally, branch transfers & samples',
        'Financials (payables, receivables, credit terms, GST & TDS, P&L / balance sheet), Analytics and e-Way Bills',
      ],
      actions: [
        'User Management: add users and choose the state(s) or district each one sees',
        'Can preview any other role with “View As Role”',
      ],
      colorClass: 'ceo',
    },
    {
      id: ROLES.STATE_SALES_HEAD,
      icon: Map,
      title: 'State Sales Head',
      scope: 'The state(s) the CEO assigned',
      features: [
        'The same dashboard as the CEO, limited to the assigned state(s)',
        'With two or more states, the State filter lists just those states',
        'Cards, map, tables and click-through lists show only those states',
      ],
      actions: [
        'Log daily sales calls / visits',
        'No Financials, Analytics, e-Way Bills or User Management',
      ],
      colorClass: 'state_sales_head',
    },
    {
      id: ROLES.DISTRICT_MANAGER,
      icon: Award,
      title: 'District Sales Manager',
      scope: 'The district the CEO assigned',
      features: [
        'The same dashboard, limited to one district, with a Cities tab',
        'Cards, map, dealers and click-through lists for that district only',
      ],
      actions: [
        'Log daily sales calls / visits',
        'No Financials, Analytics, e-Way Bills or User Management',
      ],
      colorClass: 'district_manager',
    },
    {
      id: ROLES.SALES_OFFICER,
      icon: UserCheck,
      title: 'Sales Officer',
      scope: 'Own dealers',
      features: [
        'Own sales, assigned dealers and visits',
        'Sales trend, top dealers and product mix',
      ],
      actions: [
        'Record a sales entry, log a complaint, schedule a visit',
        'No access to other officers’ data',
      ],
      colorClass: 'sales_officer',
    },
  ];

  const handleNodeClick = (roleId) => {
    if (currentUser?.role !== ROLES.CEO) {
      alert('Role switching is restricted to CEO / Admin accounts. Each user has access to their specific role dashboard.');
      return;
    }
    setRole(roleId);
    const roleLabels = {
      [ROLES.CEO]: 'CEO / Admin',
      [ROLES.STATE_SALES_HEAD]: 'State Sales Head',
      [ROLES.DISTRICT_MANAGER]: 'District Sales Manager',
      [ROLES.SALES_OFFICER]: 'Sales Officer',
    };
    alert(`Switched active view role to: ${roleLabels[roleId]}. You can view the dashboard now!`);
  };

  return (
    <div className="workflow-page" id="workflow-page">
      <div className="workflow-header">
        <h2 className="workflow-title">How Wallnut Works</h2>
        <p className="workflow-subtitle">
          From an invoice entered in Tally to the number on your screen – what each part does, why it is there, and who can see what.
        </p>
      </div>

      <h3 className="wf-section-title">1. The journey of the data</h3>
      <div className="wf-flow">
        {FLOW.map((step, i) => {
          const StepIcon = step.icon;
          return (
            <div key={step.title} className="wf-step-wrap">
              <div className="wf-step">
                <div className="wf-step-icon"><StepIcon size={20} /></div>
                <div className="wf-step-body">
                  <div className="wf-step-head">
                    <span className="wf-step-title">{step.title}</span>
                    <span className="wf-step-where"><Cloud size={11} /> {step.where}</span>
                  </div>
                  <p className="wf-step-line"><b>What it does:</b> {step.what}</p>
                  <p className="wf-step-line"><b>Why it is there:</b> {step.why}</p>
                </div>
              </div>
              {i < FLOW.length - 1 && <ArrowDown size={16} className="wf-step-arrow" />}
            </div>
          );
        })}
      </div>

      <h3 className="wf-section-title">2. Where the numbers come from</h3>
      <div className="wf-numbers">
        {NUMBERS.map(([name, text]) => (
          <div key={name} className="wf-number-row">
            <span className="wf-number-name">{name}</span>
            <span className="wf-number-text">{text}</span>
          </div>
        ))}
      </div>

      <h3 className="wf-section-title">3. Who sees what</h3>
      <p className="wf-section-note">
        {currentUser?.role === ROLES.CEO ? 'As CEO you can click a role to preview its dashboard.' : 'Each user sees only the dashboard of their own role.'}
      </p>
      <div className="workflow-flow">
        {nodes.map((node, index) => {
          const NodeIcon = node.icon;
          const isActive = currentRole === node.id;

          return (
            <div key={node.id} className="workflow-node-container">
              <div
                className={`workflow-card ${isActive ? 'active' : ''}`}
                onClick={() => handleNodeClick(node.id)}
                title={`Click to view as ${node.title}`}
              >
                <div className="workflow-icon-wrapper">
                  <div className={`workflow-icon-circle ${node.colorClass}`}>
                    <NodeIcon size={24} />
                  </div>
                </div>

                <div className="workflow-details">
                  <div className="workflow-card-header">
                    <span className="workflow-role-title">{node.title}</span>
                    <span className="workflow-scope-badge">{node.scope}</span>
                  </div>

                  <div className="workflow-grid">
                    <div className="workflow-list-section">
                      <span className="workflow-list-title">Sees</span>
                      <ul className="workflow-list">
                        {node.features.map((f, i) => (
                          <li key={i} className="workflow-list-item">{f}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="workflow-list-section">
                      <span className="workflow-list-title">Can do</span>
                      <ul className="workflow-list">
                        {node.actions.map((a, i) => (
                          <li key={i} className="workflow-list-item">{a}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {index < nodes.length - 1 && (
                <div className="workflow-arrow">
                  <div className="workflow-arrow-line" />
                  <ArrowDown size={14} style={{ color: 'var(--card-border)', marginTop: -2 }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <h3 className="wf-section-title">4. Good to know</h3>
      <ul className="wf-good-list">
        {GOOD_TO_KNOW.map((t) => <li key={t}>{t}</li>)}
      </ul>
    </div>
  );
}
