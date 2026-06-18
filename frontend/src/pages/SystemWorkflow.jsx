import { useRole, ROLES } from '../context/RoleContext';
import { Shield, Map, Award, UserCheck, ArrowDown } from 'lucide-react';
import './SystemWorkflow.css';

export default function SystemWorkflow() {
  const { currentRole, setRole } = useRole();

  const nodes = [
    {
      id: ROLES.CEO,
      icon: Shield,
      title: 'CEO / Admin',
      scope: 'All India (National Scoped)',
      features: [
        'Complete high-level organization health overview',
        'State-by-state performance aggregation & comparisons',
        'Company-wide outstanding mapping & aging analysis',
        'User management (can create State Sales Heads)'
      ],
      actions: [
        'Add State Sales Head Accounts',
        'View audit logs & system health',
        'Configure national product catalogs & target matrices'
      ],
      colorClass: 'ceo'
    },
    {
      id: ROLES.STATE_SALES_HEAD,
      icon: Map,
      title: 'State Sales Head',
      scope: 'State Scope (e.g., Madhya Pradesh)',
      features: [
        'State KPI indicators (Total Sales, Active Dealers, Target Achievement)',
        'District-wise performance bar charts & rankings',
        'Product categories mix & top SKU tracking',
        'User management (can create District Managers)'
      ],
      actions: [
        'Add District Manager Accounts',
        'Oversee district targets allocation',
        'Investigate falling dealer sales & high outstanding alerts'
      ],
      colorClass: 'state_sales_head'
    },
    {
      id: ROLES.DISTRICT_MANAGER,
      icon: Award,
      title: 'District Sales Manager',
      scope: 'District Scope (e.g., Indore / Bhopal)',
      features: [
        'District KPIs filtered to specific Area/City',
        'Sales Officer Performance bar chart (Amount by Sales Officer)',
        'Dealer performance ranking table with sortable columns',
        'User management (can create Sales Officers)'
      ],
      actions: [
        'Add Sales Officer Accounts',
        'Coordinate local distributor/dealer relationships',
        'Approve dealer visit schedules & collect outstanding'
      ],
      colorClass: 'district_manager'
    },
    {
      id: ROLES.SALES_OFFICER,
      icon: UserCheck,
      title: 'Sales Officer',
      scope: 'Officer / Dealer Scope (e.g., Rajesh Sharma)',
      features: [
        'Sales officer KPIs (Today Sales, Month Sales, Assigned Dealers)',
        'Individual sales trend line chart & top dealer breakdown',
        'Dealer upcoming & pending visits tracking',
        'Product mix category donut breakdown'
      ],
      actions: [
        'Record Sales Entry (adds transactions)',
        'Schedule Visit Entry (plans future visits)',
        'Log Dealer Complaint (initiates service ticket)',
        'Record Follow-up (payment or order commitments)'
      ],
      colorClass: 'sales_officer'
    }
  ];

  const handleNodeClick = (roleId) => {
    setRole(roleId);
    // Alert user that the view role has changed
    const roleLabels = {
      [ROLES.CEO]: 'CEO / Admin',
      [ROLES.STATE_SALES_HEAD]: 'State Sales Head',
      [ROLES.DISTRICT_MANAGER]: 'District Sales Manager',
      [ROLES.SALES_OFFICER]: 'Sales Officer'
    };
    alert(`Switched active view role to: ${roleLabels[roleId]}. You can view the dashboard now!`);
  };

  return (
    <div className="workflow-page" id="workflow-page">
      <div className="workflow-header">
        <h2 className="workflow-title">System Architecture &amp; Role Workflow</h2>
        <p className="workflow-subtitle">
          Wallnut operates on a hierarchical multi-role system. Click on any role node in the diagram below to switch your active view role and inspect its corresponding dashboard!
        </p>
      </div>

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
                      <span className="workflow-list-title">Key Dashboard Features</span>
                      <ul className="workflow-list">
                        {node.features.map((f, i) => (
                          <li key={i} className="workflow-list-item">{f}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="workflow-list-section">
                      <span className="workflow-list-title">System Actions &amp; Scope</span>
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
    </div>
  );
}
