import React, { useState, useEffect } from 'react';
import { hashPassword } from '../utils/security';
import { supabase, supabaseAdmin } from './supabase'

function Admin({ initialView = 'overview' }) {
  const [companies, setCompanies] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [viewMode, setViewMode] = useState('current');
  const [adminData, setAdminData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [expandedDamageReports, setExpandedDamageReports] = useState({});
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newEmployeePassword, setNewEmployeePassword] = useState('');
  const [passwordResetMessage, setPasswordResetMessage] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateRangeMode, setDateRangeMode] = useState('single');
  const [selectedLotForPassword, setSelectedLotForPassword] = useState('');
  const [currentSection, setCurrentSection] = useState(initialView);

const [passwordChangeModal, setPasswordChangeModal] = useState({
  open: false,
  userType: null,
  newPassword: '',
  confirmPassword: '',
  message: ''
});
  const ClientManagement = () => {
    const [clients, setClients] = useState([]);
    const [newClient, setNewClient] = useState({ 
      username: '', 
      password: '',
      company_name: ''  // Optional field
    });
    const [loading, setLoading] = useState(false);
    const [clientMessage, setClientMessage] = useState('');

    useEffect(() => {
      fetchClients();
    }, []);

    const fetchClients = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('app_users')
          .select('*')
          .eq('role', 'client')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setClients(data || []);
      } catch (error) {
        console.error('Error fetching clients:', error);
        setClientMessage('Erreur lors du chargement des clients');
      } finally {
        setLoading(false);
      }
    };

    const createClient = async () => {
      // Only require username and password
      if (!newClient.username.trim() || !newClient.password.trim()) {
        setClientMessage('Veuillez remplir les champs obligatoires (*)');
        return;
      }

      setLoading(true);
      setClientMessage('');
      
      try {
        const username = `client_${newClient.username.toLowerCase().replace(/\s+/g, '_')}`;
        
     
        const company_name = newClient.company_name.trim() || 
          newClient.username
            .replace(/_/g, ' ')
            .toUpperCase();
        
        // Check if username exists
        const { data: existingClient } = await supabase
          .from('app_users')
          .select('username')
          .eq('username', username)
          .maybeSingle();

        if (existingClient) {
          setClientMessage('Ce nom d\'utilisateur existe déjà');
          setLoading(false);
          return;
        }

        const hashedPassword = await hashPassword(newClient.password);
        
       
        const { error } = await supabaseAdmin
          .from('app_users')
          .insert([{
            username: username,
            password_hash: hashedPassword,
            role: 'client',
            company_name: company_name || null
          }]);
        
        if (error) throw error;
        
        setClientMessage(`✅ Client "${company_name}" créé avec succès!`);
        setNewClient({ username: '', password: '', company_name: '' });
        fetchClients();
        
      } catch (error) {
        console.error('Error creating client:', error);
        setClientMessage('❌ Erreur: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    const deleteClient = async (clientId, clientName) => {
      if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le client "${clientName}"?`)) return;
      
      try {
        const { error } = await supabaseAdmin
          .from('app_users')
          .delete()
          .eq('id', clientId)
          .eq('role', 'client');
        
        if (error) throw error;
        
        setClientMessage('✅ Client supprimé');
        fetchClients();
      } catch (error) {
        console.error('Error deleting client:', error);
        setClientMessage('❌ Erreur: ' + error.message);
      }
    };

    const resetClientPassword = async (clientId, clientName) => {
      const newPassword = prompt(`Entrez le nouveau mot de passe pour "${clientName}":`);
      
      if (!newPassword || newPassword.length < 6) {
        alert('Le mot de passe doit contenir au moins 6 caractères');
        return;
      }

      try {
        const hashedPassword = await hashPassword(newPassword);
        
        const { error } = await supabaseAdmin
          .from('app_users')
          .update({ password_hash: hashedPassword })
          .eq('id', clientId);
        
        if (error) throw error;
        
        alert(`✅ Mot de passe mis à jour pour "${clientName}"`);
      } catch (error) {
        console.error('Error resetting password:', error);
        alert('❌ Erreur lors de la réinitialisation du mot de passe');
      }
    };

    return (
      <div className="client-management" style={{ 
        background: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        border: '1px solid #ddd',
        marginTop: '20px'
      }}>
        <h2> Gestion des Clients</h2>
        
        {clientMessage && (
          <div style={{
            padding: '10px',
            background: clientMessage.includes('✅') ? '#d4edda' : '#f8d7da',
            color: clientMessage.includes('✅') ? '#155724' : '#721c24',
            borderRadius: '4px',
            marginBottom: '15px'
          }}>
            {clientMessage}
        </div>
        )}
        
        {/* Create New Client Form */}
        <div className="create-client-form" style={{ marginBottom: '30px' }}>
          <h3>Créer un Nouveau Client</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 1fr auto',
            gap: '10px', 
            marginBottom: '15px',
            alignItems: 'end'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                Nom d'utilisateur (sans "client_"): *
              </label>
              <input
                type="text"
                placeholder="ex: abc_company"
                value={newClient.username}
                onChange={(e) => setNewClient({...newClient, username: e.target.value})}
                style={{ padding: '10px', width: '100%', boxSizing: 'border-box' }}
                required
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                Mot de passe: *
              </label>
              <input
                type="password"
                placeholder="Min. 6 caractères"
                value={newClient.password}
                onChange={(e) => setNewClient({...newClient, password: e.target.value})}
                style={{ padding: '10px', width: '100%', boxSizing: 'border-box' }}
                required
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                Nom d'entreprise (Optionnel):
              </label>
              <input
                type="text"
                placeholder="ex: ABC Company SARL"
                value={newClient.company_name}
                onChange={(e) => setNewClient({...newClient, company_name: e.target.value})}
                style={{ padding: '10px', width: '100%', boxSizing: 'border-box' }}
              />
              <small style={{ fontSize: '11px', color: '#666' }}>Laissez vide pour générer automatiquement</small>
            </div>
            
            <button 
              onClick={createClient} 
              disabled={loading || !newClient.username.trim() || !newClient.password.trim()}
              style={{ 
                padding: '10px 20px', 
                background: '#28a745', 
                color: 'white', 
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                height: 'fit-content',
                opacity: (!newClient.username.trim() || !newClient.password.trim()) ? 0.6 : 1
              }}
            >
              {loading ? 'Création...' : 'Créer Client'}
            </button>
          </div>
        </div>

        {/* Existing Clients List */}
        <div className="clients-list">
          <h3>Clients Existants ({clients.length})</h3>
          
          {loading ? (
            <p>Chargement des clients...</p>
          ) : clients.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
              Aucun client créé
            </p>
          ) : (
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              border: '1px solid #ddd'
            }}>
              <thead>
                <tr style={{ background: '#f2f2f2' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Username</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Entreprise</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Créé le</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(client => (
                  <tr key={client.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>{client.username}</td>
                    <td style={{ padding: '12px' }}>
                      {client.company_name || 
                       client.username.replace('client_', '').replace(/_/g, ' ').toUpperCase()}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {new Date(client.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => resetClientPassword(client.id, client.username)}
                          style={{ 
                            background: '#17a2b8', 
                            color: 'white', 
                            border: 'none', 
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                        >
                          Réinit. MDP
                        </button>
                        <button 
                          onClick={() => deleteClient(client.id, client.username)}
                          style={{ 
                            background: '#dc3545', 
                            color: 'white', 
                            border: 'none', 
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  
  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase.from('companies').select('*');
      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchAdminOverview = async () => {
    if (dateRangeMode === 'single' && !selectedDate) {
      return;
    }
    if (dateRangeMode === 'range' && (!startDate || !endDate)) {
      return;
    }

    setLoading(true);
    try {
      const overviewData = await Promise.all(
        companies.map(async (company) => {
          let tasks = [];
          let damageReports = [];

          if (viewMode === 'current') {
            if (dateRangeMode === 'single') {
              const { data: currentTasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('id_entreprise', company.id)
                .eq('date_exécution', selectedDate);

              const { data: currentDamage } = await supabase
                .from('signalements_degats')
                .select('*')
                .eq('id_entreprise', company.id)
                .eq('report_date', selectedDate)
                .eq('status', 'submitted')
                .eq('archivé', true);

              tasks = currentTasks || [];
              damageReports = currentDamage || [];
            } else {
              const { data: currentTasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('id_entreprise', company.id)
                .gte('date_exécution', startDate)
                .lte('date_exécution', endDate);

              const { data: currentDamage } = await supabase
                .from('signalements_degats')
                .select('*')
                .eq('id_entreprise', company.id)
                .eq('report_date', selectedDate)
                .eq('status', 'submitted')
                .eq('archivé', true);

              tasks = currentTasks || [];
              damageReports = currentDamage || [];
            }
          } else {
            if (dateRangeMode === 'single') {
              const { data: historyTasks } = await supabase
                .from('task_history')
                .select('*')
                .eq('id_entreprise', company.id)
                .eq('date_exécution', selectedDate);

              const { data: historyDamage } = await supabase
                .from('damage_history')
                .select('*')
                .eq('id_entreprise', company.id)
                .eq('report_date', selectedDate);

              tasks = historyTasks || [];
              damageReports = historyDamage || [];
            } else {
              const { data: historyTasks } = await supabase
                .from('task_history')
                .select('*')
                .eq('id_entreprise', company.id)
                .gte('date_exécution', startDate)
                .lte('date_exécution', endDate);

              const { data: historyDamage } = await supabase
                .from('damage_history')
                .select('*')
                .eq('id_entreprise', company.id)
                .gte('report_date', startDate)
                .lte('report_date', endDate);

              tasks = historyTasks || [];
              damageReports = historyDamage || [];
            }
          }

          const completedTasks = tasks.filter(task => task.complété).length;
          const totalTasks = tasks.length;
          let tasksMissingFromHistory = 0;
          
          if (viewMode === 'history') {
            tasksMissingFromHistory = totalTasks - completedTasks;
          }

          return {
            company,
            completedTasks,
            totalTasks,
            completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
            hasDamageReports: damageReports.length > 0,
            damageReportsCount: damageReports.length,
            tasks: tasks,
            damageReports: damageReports,
            isHistorical: viewMode === 'history',
            tasksMissingFromHistory: tasksMissingFromHistory
          };
        })
      );

      setAdminData(overviewData);
    } catch (error) {
       console.log(error);
    }
    setLoading(false);
  };

  const toggleDamageReports = (companyId) => {
    setExpandedDamageReports(prev => ({
      ...prev,
      [companyId]: !prev[companyId]
    }));
  };

  const exportAllAsHTML = () => {
    if (dateRangeMode === 'single' && !selectedDate) {
      alert('Veuillez sélectionner une date d\'abord');
      return;
    }
    if (dateRangeMode === 'range' && (!startDate || !endDate)) {
      alert('Veuillez sélectionner une plage de dates d\'abord');
      return;
    }

    const dateDisplay = dateRangeMode === 'single' 
      ? selectedDate 
      : `${startDate} au ${endDate}`;

    const formatSafeDate = (dateString) => {
      if (!dateString) return 'N/A';
      try {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('fr-FR');
      } catch {
        return 'N/A';
      }
    };

    const detailedTasksHTML = adminData.map(item => `
      <div class="company-detailed-section">
        <h3>${item.company.name} - ${item.completedTasks}/${item.totalTasks} complétées (${item.completionRate}%)</h3>
        
        <table class="detailed-tasks">
          <thead>
            <tr>
              <th>Tâche</th>
              <th>Statut</th>
              <th>Heure Début</th>
              <th>Heure Fin</th>
              <th>Remarques</th>
              ${viewMode === 'history' ? '<th>Exécutée le</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${item.tasks.map(task => `
              <tr class="${task.complété ? 'task-completed' : 'task-incomplete'}">
                <td>${task.nom_tâche}</td>
                <td>${task.complété ? 'Complétée' : 'Incomplète'}</td>
                <td>${task.heure_début || '--:--'}</td>
                <td>${task.heure_fin || '--:--'}</td>
                <td>${task.remarques || ''}</td>
                ${viewMode === 'history' ? `<td>${formatSafeDate(task.date_exécution)}</td>` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        ${item.damageReports.length > 0 ? `
          <div class="damage-reports-section">
            <h4>Rapports de Dégâts (${item.damageReports.length})</h4>
            ${item.damageReports.map((report, index) => `
              <div class="damage-report">
                <p><strong>Rapport ${index + 1}:</strong> ${report.description_degat}</p>
                <p><strong>Heures:</strong> ${report.heure_debut} - ${report.heure_fin}</p>
                ${report.photo_avant_url || report.photo_apres_url ? `
                  <p><strong>Photos:</strong></p>
                  <div class="damage-photos">
                    ${report.photo_avant_url ? `
                      <div class="photo-item">
                        <p>Avant:</p>
                        <img src="${report.photo_avant_url}" alt="Avant réparation" class="export-photo">
                      </div>
                    ` : ''}
                    ${report.photo_apres_url ? `
                      <div class="photo-item">
                        <p>Après:</p>
                        <img src="${report.photo_apres_url}" alt="Après réparation" class="export-photo">
                      </div>
                    ` : ''}
                  </div>
                ` : ''}
                <p class="report-date">
                  Exécutée le: ${formatSafeDate(report.report_date || report.date_exécution)}
                </p>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
      <hr class="company-divider">
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Rapport Détail Admin - ${dateDisplay}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            color: #333; 
            line-height: 1.4;
            font-size: 12px;
          }
          .admin-header { 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px; 
            margin-bottom: 20px; 
            border: 1px solid #ddd;
            page-break-after: avoid;
          }
          h1 { 
            color: #2c3e50; 
            text-align: center; 
            border-bottom: 2px solid #2c3e50; 
            padding-bottom: 10px; 
            margin-bottom: 20px;
            font-size: 20px;
          }
          h3 {
            color: #34495e;
            background: #ecf0f1;
            padding: 10px;
            border-radius: 4px;
            margin: 15px 0 10px 0;
            font-size: 16px;
          }
          h4 {
            color: #c0392b;
            margin: 15px 0 8px 0;
            font-size: 14px;
          }
          .admin-filters { 
            background: white; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 15px 0; 
            border: 1px solid #ddd;
          }
          
          .summary-table {
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0; 
            font-size: 12px; 
            border: 1px solid #ddd;
            page-break-after: avoid;
          }
          .summary-table th, .summary-table td { 
            border: 1px solid #ddd; 
            padding: 10px; 
            text-align: left; 
          }
          .summary-table th { 
            background: #34495e; 
            color: white; 
            font-weight: bold; 
          }
          .summary-table tr:nth-child(even) { 
            background-color: #f8f9fa; 
          }
          .has-damage { 
            background: #ffebee !important; 
            font-weight: bold; 
          }
          .has-damage td { 
            color: #d32f2f; 
          }
          
          .detailed-tasks {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0 20px 0;
            font-size: 11px;
            border: 1px solid #ddd;
          }
          .detailed-tasks th, .detailed-tasks td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          .detailed-tasks th {
            background: #2c3e50;
            color: white;
          }
          .task-completed {
            background-color: #d5f4e6;
          }
          .task-incomplete {
            background-color: #f8d7da;
          }
          
          .damage-reports-section {
            margin: 15px 0;
            padding: 15px;
            background: #fff3cd;
            border-radius: 5px;
            border: 1px solid #ffeaa7;
          }
          .damage-report {
            margin: 10px 0;
            padding: 10px;
            background: white;
            border-radius: 4px;
            border: 1px solid #ddd;
          }
          .damage-photos {
            display: flex;
            gap: 20px;
            margin: 10px 0;
            flex-wrap: wrap;
          }
          .photo-item {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .export-photo {
              width: 100%;      
              max-width: 600px; 
             height: auto;
            object-fit: cover;
            border: 1px solid #ddd;
            border-radius: 4px;
          }
          
          @media print { 
            body { 
              margin: 0.5cm; 
              font-size: 10pt;
            }
            .admin-export-buttons, .view-details-btn { 
              display: none !important; 
            }
            .company-detailed-section {
              page-break-inside: avoid;
            }
            .detailed-tasks {
              font-size: 9pt;
            }
            .export-photo {
              width: 120px;
              height: 120px;
            }
          }
          
          .company-divider {
            border: none;
            border-top: 2px dashed #ccc;
            margin: 25px 0;
          }
          .report-date {
            font-size: 10px;
            color: #666;
            margin: 5px 0 0 0;
          }
        </style>
      </head>
      <body>
        <div class="admin-header">
          <h1>Rapport Détail Admin - ${dateDisplay}</h1>
          <div class="admin-filters">
            <div><strong>Période:</strong> ${dateDisplay}</div>
            <div><strong>Vue:</strong> ${viewMode === 'current' ? 'Données Actuelles' : 'Historique Validé'}</div>
            <div><strong>Mode:</strong> ${dateRangeMode === 'single' ? 'Date unique' : 'Plage de dates'}</div>
            <div><strong>Généré le:</strong> ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}</div>
          </div>
        </div>

        <table class="summary-table">
          <thead>
            <tr>
              <th>Entreprise</th>
              <th>Tâches Complétées</th>
              <th>Taux Completion</th>
              <th>Rapports Dégâts</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            ${adminData.map(item => `
              <tr class="${item.hasDamageReports ? 'has-damage' : ''}">
                <td><strong>${item.company.name}</strong></td>
                <td>${item.completedTasks}/${item.totalTasks}</td>
                <td>${item.completionRate}%</td>
                <td>${item.hasDamageReports ? `${item.damageReportsCount} rapport(s)` : 'Aucun'}</td>
                <td>${item.tasksMissingFromHistory > 0 ? `${item.tasksMissingFromHistory} incomplète(s)` : 'Tout complété'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${detailedTasksHTML}
        
        <div class="report-footer">
          <p><em>Rapport généré automatiquement par Maintenance Manager</em></p>
        </div>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    win.document.write(htmlContent);
    win.document.close();
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (dateRangeMode === 'single' && !selectedDate) {
      return;
    }
    
    if (dateRangeMode === 'range' && (!startDate || !endDate)) {
      return;
    }
    
    fetchAdminOverview();
  }, [selectedDate, startDate, endDate, viewMode, dateRangeMode]);

  const CompanyDetailView = ({ company, onBack, isHistorical }) => {
    const [tasks, setTasks] = useState([]);
    const [damageReports, setDamageReports] = useState([]);

    useEffect(() => {
      const fetchCompanyDetails = async () => {
        let tasksData = [];
        let damageData = [];

        if (isHistorical) {
          const { data: historyTasks } = await supabase
            .from('task_history')
            .select('*')
            .eq('id_entreprise', company.id)
            .eq('date_exécution', selectedDate);

          const { data: historyDamage } = await supabase
            .from('damage_history')
            .select('*')
            .eq('id_entreprise', company.id)
            .gte('validated_at', `${selectedDate}T00:00:00`)
            .lte('validated_at', `${selectedDate}T23:59:59`);

          tasksData = historyTasks || [];
          damageData = historyDamage || [];
        } else {
          const { data: currentTasks } = await supabase
            .from('tasks')
            .select('*')
            .eq('id_entreprise', company.id)
            .eq('date_exécution', selectedDate);

          const { data: currentDamage } = await supabase
            .from('signalements_degats')
            .select('*')
            .eq('id_entreprise', company.id)
            .eq('status', 'submitted')
            .eq('archivé', true)
            .gte('date_archivage', `${selectedDate}T00:00:00`)
            .lte('date_archivage', `${selectedDate}T23:59:59`);

          tasksData = currentTasks || [];
          damageData = currentDamage || [];
        }

        setTasks(tasksData);
        setDamageReports(damageData);
      };

      fetchCompanyDetails();
    }, []);

    return (
      <div className="company-detail">
        <button onClick={onBack} className="nav-button back">← Retour à l'overview</button>
        <h2>Détails: {company.name} - {selectedDate} {isHistorical && 'Historique'}</h2>
        
        <div className="tasks-section">
          <h3>Tâches ({tasks.filter(t => t.complété).length}/{tasks.length} complétées)</h3>
          <table>
            <thead>
              <tr>
                <th>Tâche</th>
                <th>Complétée</th>
                <th>Heures</th>
                <th>Remarques</th>
                {isHistorical && <th>Validée le</th>}
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr key={task.id} className={task.complété ? 'completed' : ''}>
                  <td>{task.nom_tâche}</td>
                  <td>{task.complété ? '✓' : '✗'}</td>
                  <td>{task.heure_début} - {task.heure_fin}</td>
                  <td>{task.remarques}</td>
                  {isHistorical && <td>{new Date(task.validated_at).toLocaleDateString('fr-FR')}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {damageReports.length > 0 && (
          <div className="damage-section">
            <h3>Rapports de Dégâts ({damageReports.length})</h3>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Heures</th>
                  <th>Photos</th>
                  {isHistorical && <th>Validée le</th>}
                </tr>
              </thead>
              <tbody>
                {damageReports.map(report => (
                  <tr key={report.id} className="damage-row">
                    <td>{report.description_degat}</td>
                    <td>{report.heure_debut} - {report.heure_fin}</td>
                    <td>
                      {report.photo_avant_url && 'Avant '}
                      {report.photo_apres_url && 'Après'}
                    </td>
                    {isHistorical && <td>{new Date(report.validated_at).toLocaleDateString('fr-FR')}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const resetEmployeePassword = async () => {
    if (!selectedLotForPassword || !newEmployeePassword) {
      setPasswordResetMessage('Veuillez sélectionner un lot et entrer un mot de passe');
      return;
    }

    try {
      const hashedPassword = await hashPassword(newEmployeePassword);
      
      const { data, error } = await supabaseAdmin
        .from('company_passwords')
        .upsert({
          company_id: selectedLotForPassword,
          password_hash: hashedPassword,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'company_id'
        })
        .select();
      
      if (error) throw error;
      
      const companyName = companies.find(c => c.id == selectedLotForPassword)?.name;
      setPasswordResetMessage(`Mot de passe pour ${companyName} mis à jour`);
      
      setNewEmployeePassword('');
      setSelectedLotForPassword('');
      
    } catch (error) {
      setPasswordResetMessage('Erreur lors de la mise à jour du mot de passe');
       console.log(error);
    }
  };

  if (selectedCompany) {
    const companyData = adminData.find(item => item.company.id === selectedCompany.id);
    return (
      <CompanyDetailView 
        company={selectedCompany} 
        onBack={() => setSelectedCompany(null)}
        isHistorical={companyData?.isHistorical}
      />
    );
  }
  const InventoryView = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('last_updated', { ascending: false });
      
      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Filter inventory based on search
  const filteredInventory = inventory.filter(item =>
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const updateInventoryItem = async (itemId, updates) => {
    try {
      const { error } = await supabaseAdmin
        .from('inventory')
        .update({
          ...updates,
          last_updated: new Date().toISOString()
        })
        .eq('id', itemId);
      
      if (error) throw error;
      
      // Refresh the list
      fetchInventory();
      return true;
    } catch (error) {
      console.error('Error updating inventory:', error);
      alert('❌ Erreur de mise à jour: ' + error.message);
      return false;
    }
  };

  const deleteInventoryItem = async (itemId, itemName) => {
    if (!window.confirm(`Supprimer "${itemName}" de l'inventaire?`)) return;
    
    try {
      const { error } = await supabaseAdmin
        .from('inventory')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
      
      fetchInventory();
      alert('✅ Article supprimé');
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      alert('❌ Erreur de suppression: ' + error.message);
    }
  };
const PasswordChangeModal = () => {
  const handleSubmit = async () => {
    // Validation
    if (!passwordChangeModal.newPassword.trim()) {
      setPasswordChangeModal(prev => ({...prev, message: '❌ Entrez un mot de passe'}));
      return;
    }
    
    if (passwordChangeModal.newPassword.length < 6) {
      setPasswordChangeModal(prev => ({...prev, message: '❌ Minimum 6 caractères'}));
      return;
    }
    
    if (passwordChangeModal.newPassword !== passwordChangeModal.confirmPassword) {
      setPasswordChangeModal(prev => ({...prev, message: '❌ Les mots de passe ne correspondent pas'}));
      return;
    }
    
    try {
      // Hash the new password
      const hashedPassword = await hashPassword(passwordChangeModal.newPassword);
      
      // Update in database
      const { error } = await supabaseAdmin
        .from('app_users')
        .update({ 
          password_hash: hashedPassword,
          updated_at: new Date().toISOString()
        })
        .eq('username', passwordChangeModal.userType === 'manager' ? 'manager' : 'inventory')
        .eq('role', passwordChangeModal.userType === 'manager' ? 'manager' : 'inventory_worker');
      
      if (error) throw error;
      
      setPasswordChangeModal(prev => ({
        ...prev,
        message: `✅ Mot de passe ${passwordChangeModal.userType === 'manager' ? 'Manager' : 'Inventaire'} changé avec succès!`,
        newPassword: '',
        confirmPassword: ''
      }));
      
      // Auto-close after success
      setTimeout(() => {
        setPasswordChangeModal({ open: false, userType: null, newPassword: '', confirmPassword: '', message: '' });
      }, 2000);
      
    } catch (error) {
      console.error('Password change error:', error);
      setPasswordChangeModal(prev => ({...prev, message: '❌ Erreur: ' + error.message}));
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        padding: '25px',
        borderRadius: '10px',
        width: '450px',
        maxWidth: '90%',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
      }}>
        <h3 style={{ marginTop: 0, color: '#2c3e50' }}>
          🔑 Changer Mot de Passe - {passwordChangeModal.userType === 'manager' ? 'Manager' : 'Inventaire'}
        </h3>
        
        {passwordChangeModal.message && (
          <div style={{
            padding: '10px',
            marginBottom: '15px',
            background: passwordChangeModal.message.includes('✅') ? '#d4edda' : '#f8d7da',
            color: passwordChangeModal.message.includes('✅') ? '#155724' : '#721c24',
            borderRadius: '6px',
            border: `1px solid ${passwordChangeModal.message.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            {passwordChangeModal.message}
          </div>
        )}
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Nouveau mot de passe:
          </label>
          <input
            type="password"
            value={passwordChangeModal.newPassword}
            onChange={(e) => setPasswordChangeModal({...passwordChangeModal, newPassword: e.target.value})}
            placeholder="Minimum 6 caractères"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px'
            }}
            autoComplete="new-password"
          />
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Confirmer le mot de passe:
          </label>
          <input
            type="password"
            value={passwordChangeModal.confirmPassword}
            onChange={(e) => setPasswordChangeModal({...passwordChangeModal, confirmPassword: e.target.value})}
            placeholder="Retapez le mot de passe"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px'
            }}
            autoComplete="new-password"
          />
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: '10px',
          justifyContent: 'flex-end',
          marginTop: '20px'
        }}>
          <button
            onClick={() => setPasswordChangeModal({ open: false, userType: null, newPassword: '', confirmPassword: '', message: '' })}
            style={{
              padding: '10px 20px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '15px'
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!passwordChangeModal.newPassword.trim() || !passwordChangeModal.confirmPassword.trim()}
            style={{
              padding: '10px 20px',
              background: passwordChangeModal.newPassword.trim() ? '#28a745' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: passwordChangeModal.newPassword.trim() ? 'pointer' : 'not-allowed',
              fontSize: '15px',
              fontWeight: 'bold'
            }}
          >
            💾 Sauvegarder
          </button>
        </div>
        
        <div style={{
          marginTop: '20px',
          padding: '10px',
          background: '#e7f3ff',
          borderRadius: '6px',
          fontSize: '13px',
          color: '#2c3e50'
        }}>
          <p style={{ margin: '5px 0' }}>
            <strong>Compte affecté:</strong> {passwordChangeModal.userType === 'manager' ? 'manager' : 'inventory'}
          </p>
          <p style={{ margin: '5px 0' }}>
            <strong>Rôle:</strong> {passwordChangeModal.userType === 'manager' ? 'manager' : 'inventory_worker'}
          </p>
          <p style={{ margin: '5px 0', color: '#dc3545', fontWeight: 'bold' }}>
            ⚠️ L'utilisateur devra se reconnecter avec le nouveau mot de passe
          </p>
        </div>
      </div>
    </div>
  );
};
  return (
    <div style={{ 
      background: 'white', 
      padding: '20px', 
      borderRadius: '8px',
      border: '1px solid #ddd',
      marginTop: '20px'
    }}>
      <h2>📦 Inventaire - Stock Actuel</h2>
      
      {/* Search and Controls */}
      <div style={{ 
        display: 'flex', 
        gap: '15px', 
        marginBottom: '20px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 2 }}>
          <input
            type="text"
            placeholder="Rechercher par nom ou emplacement..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
        </div>
        
        <button 
          onClick={fetchInventory}
          style={{ 
            padding: '10px 15px', 
            background: '#6c757d', 
            color: 'white', 
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔄 Actualiser
        </button>
        
        <div style={{ marginLeft: 'auto', color: '#666' }}>
          {filteredInventory.length} articles / {inventory.length} total
        </div>
      </div>

      {loading ? (
        <p>Chargement de l'inventaire...</p>
      ) : filteredInventory.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
          {searchTerm ? 'Aucun article trouvé' : 'Aucun article dans l\'inventaire'}
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            border: '1px solid #ddd',
            fontSize: '14px'
          }}>
            <thead>
              <tr style={{ background: '#f2f2f2' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Article</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Quantité</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Emplacement</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Catégorie</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Dernière mise à jour</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>
                    <strong>{item.item_name}</strong>
                    {item.notes && (
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '3px' }}>
                        📝 {item.notes}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ 
                      fontSize: '18px', 
                      fontWeight: 'bold',
                      color: item.quantity <= 10 ? '#dc3545' : '#28a745'
                    }}>
                      {item.quantity}
                      {item.quantity <= 10 && (
                        <div style={{ fontSize: '11px', color: '#dc3545' }}>
                          ⚠️ Stock faible
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {item.location || '—'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {item.category ? (
                      <span style={{
                        padding: '3px 8px',
                        background: '#e7f3ff',
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}>
                        {item.category}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {new Date(item.last_updated).toLocaleDateString('fr-FR')}
                    <br/>
                    <small style={{ color: '#666' }}>
                      {new Date(item.last_updated).toLocaleTimeString('fr-FR')}
                    </small>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
                      {/* Update Quantity Button */}
                      <button
                        onClick={async () => {
                          const newQty = prompt(`Nouvelle quantité pour "${item.item_name}":`, item.quantity);
                          if (newQty !== null && !isNaN(newQty)) {
                            const qty = parseInt(newQty);
                            if (qty >= 0) {
                              await updateInventoryItem(item.id, { quantity: qty });
                            } else {
                              alert('La quantité doit être ≥ 0');
                            }
                          }
                        }}
                        style={{
                          padding: '5px 10px',
                          background: '#17a2b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        ✏️ Qté
                      </button>
                      
                      {/* Edit Details Button */}
                      <button
                        onClick={async () => {
                          const newLocation = prompt('Nouvel emplacement:', item.location || '');
                          if (newLocation !== null) {
                            const newCategory = prompt('Nouvelle catégorie:', item.category || '');
                            if (newCategory !== null) {
                              await updateInventoryItem(item.id, {
                                location: newLocation,
                                category: newCategory
                              });
                            }
                          }
                        }}
                        style={{
                          padding: '5px 10px',
                          background: '#ffc107',
                          color: '#212529',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        📍 Détails
                      </button>
                      
                      {/* Delete Button */}
                      <button
                        onClick={() => deleteInventoryItem(item.id, item.item_name)}
                        style={{
                          padding: '5px 10px',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        🗑️ Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Summary Stats */}
      {inventory.length > 0 && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          background: '#e7f3ff', 
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div>
              <strong>Total articles:</strong> {inventory.length}
            </div>
            <div>
              <strong>Quantité totale:</strong> {inventory.reduce((sum, item) => sum + item.quantity, 0)} unités
            </div>
            <div style={{ color: inventory.filter(i => i.quantity <= 10).length > 0 ? '#dc3545' : '#28a745' }}>
              <strong>Stock faible (≤10):</strong> {inventory.filter(i => i.quantity <= 10).length} articles
            </div>
            <div>
              <strong>Dernière mise à jour:</strong> {
                inventory.length > 0 
                  ? new Date(Math.max(...inventory.map(i => new Date(i.last_updated)))).toLocaleDateString('fr-FR')
                  : '—'
              }
            </div>
          </div>
        </div>
      )}
      
      {/* Export Option */}
      {inventory.length > 0 && (
        <div style={{ marginTop: '15px', textAlign: 'right' }}>
          <button
            onClick={() => {
              const csv = [
                ['Article', 'Quantité', 'Emplacement', 'Catégorie', 'Dernière mise à jour', 'Notes'],
                ...inventory.map(item => [
                  item.item_name,
                  item.quantity,
                  item.location || '',
                  item.category || '',
                  new Date(item.last_updated).toLocaleDateString('fr-FR'),
                  item.notes || ''
                ])
              ].map(row => row.join(';')).join('\n');
              
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `inventaire_${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
            }}
            style={{
              padding: '10px 20px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            📥 Exporter en CSV
          </button>
        </div>
      )}
    </div>
  );
};
  const TicketsManagement = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'completed', 'archived'

  useEffect(() => {
    fetchTickets();
  }, [filterStatus]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('tickets')
        .select('*')
        .order('submitted_at', { ascending: false });
      
      // Apply status filter
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTicket = async (ticketId, clientName) => {
    if (!window.confirm(`Supprimer le ticket de "${clientName}"? Cette action est irréversible.`)) return;
    
    try {
      const { error } = await supabaseAdmin
        .from('tickets')
        .delete()
        .eq('id', ticketId);
      
      if (error) throw error;
      
      // Remove from local state
      setTickets(prev => prev.filter(t => t.id !== ticketId));
      alert('✅ Ticket supprimé');
      
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('❌ Erreur: ' + error.message);
    }
  };

  const updateTicketStatus = async (ticketId, newStatus) => {
    try {
      const { error } = await supabaseAdmin
        .from('tickets')
        .update({ status: newStatus })
        .eq('id', ticketId);
      
      if (error) throw error;
      
      // Update local state
      setTickets(prev =>
        prev.map(t =>
          t.id === ticketId ? { ...t, status: newStatus } : t
        )
      );
      
      alert(`✅ Statut changé à "${newStatus}"`);
      
    } catch (error) {
      console.error('Error updating ticket:', error);
      alert('❌ Erreur: ' + error.message);
    }
  };

  return (
    <div style={{ 
      background: 'white', 
      padding: '20px', 
      borderRadius: '8px',
      border: '1px solid #ddd',
      marginTop: '20px'
    }}>
      <h2>🎫 Gestion des Tickets</h2>
      
      {/* Filters */}
      <div style={{ 
        display: 'flex', 
        gap: '15px', 
        marginBottom: '20px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div>
          <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Filtrer par statut:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="all">Tous les tickets</option>
            <option value="pending">En attente</option>
            <option value="assigned">Assigné</option>
            <option value="completed">Terminé</option>
            <option value="archived">Archivé</option>
          </select>
        </div>
        
        <button 
          onClick={fetchTickets}
          style={{ 
            padding: '8px 15px', 
            background: '#6c757d', 
            color: 'white', 
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔄 Actualiser
        </button>
        
        <div style={{ marginLeft: 'auto', color: '#666', fontSize: '14px' }}>
          Total: <strong>{tickets.length}</strong> tickets
        </div>
      </div>

      {loading ? (
        <p>Chargement des tickets...</p>
      ) : tickets.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
          Aucun ticket trouvé
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            border: '1px solid #ddd',
            fontSize: '14px'
          }}>
            <thead>
              <tr style={{ background: '#f2f2f2' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>ID</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Client</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Description</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Soumis le</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Statut</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Commentaire</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(ticket => (
                <tr key={ticket.id} style={{ 
                  borderBottom: '1px solid #eee',
                  background: ticket.status === 'completed' ? '#f8fff8' : 
                             ticket.status === 'archived' ? '#f8f9fa' : 'white'
                }}>
                  <td style={{ padding: '12px' }}>
                    <strong>#{ticket.id}</strong>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <strong>{ticket.client_name}</strong>
                    {ticket.client_user_id && (
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        ID: {ticket.client_user_id.substring(0, 8)}...
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {ticket.issue_description}
                    {ticket.photo_url && (
                      <div style={{ marginTop: '5px' }}>
                        <a href={ticket.photo_url} target="_blank" rel="noopener noreferrer">
                          📷 Voir photo
                        </a>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {new Date(ticket.submitted_at).toLocaleDateString('fr-FR')}
                    <br/>
                    <small style={{ color: '#666' }}>
                      {new Date(ticket.submitted_at).toLocaleTimeString('fr-FR')}
                    </small>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <select
                      value={ticket.status}
                      onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                      style={{
                        padding: '5px 8px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        background: 
                          ticket.status === 'completed' ? '#d4edda' :
                          ticket.status === 'assigned' ? '#fff3cd' :
                          ticket.status === 'archived' ? '#e9ecef' :  
                          '#f8d7da',
                        color: 
                          ticket.status === 'completed' ? '#155724' :
                          ticket.status === 'assigned' ? '#856404' :
                          ticket.status === 'archived' ? '#495057' :  
                          '#721c24',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="pending">En attente</option>
                      <option value="assigned">Assigné</option>
                      <option value="completed">Terminé</option>
                      <option value="archived">Archivé</option>
                    </select>
                  </td>
                  <td style={{ padding: '12px', maxWidth: '200px' }}>
                    {ticket.status_reason ? (
                      <div style={{ 
                        padding: '5px', 
                        background: '#e7f3ff', 
                        borderRadius: '4px',
                        fontSize: '13px'
                      }}>
                        {ticket.status_reason}
                      </div>
                    ) : (
                      <span style={{ color: '#999', fontStyle: 'italic' }}>Aucun</span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
                      <button
                        onClick={() => {
                          const newComment = prompt('Nouveau commentaire:', ticket.status_reason || '');
                          if (newComment !== null) {
                            supabaseAdmin
                              .from('tickets')
                              .update({ status_reason: newComment })
                              .eq('id', ticket.id)
                              .then(() => {
                                setTickets(prev =>
                                  prev.map(t =>
                                    t.id === ticket.id 
                                      ? { ...t, status_reason: newComment } 
                                      : t
                                  )
                                );
                                alert('✅ Commentaire mis à jour');
                              });
                          }
                        }}
                        style={{
                          padding: '5px 10px',
                          background: '#17a2b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        💬 Modif. comment.
                      </button>
                      <button
                        onClick={() => deleteTicket(ticket.id, ticket.client_name)}
                        style={{
                          padding: '5px 10px',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        🗑️ Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Export option */}
      {tickets.length > 0 && (
        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button
            onClick={() => {
              const csv = [
                ['ID', 'Client', 'Description', 'Soumis le', 'Statut', 'Commentaire'],
                ...tickets.map(t => [
                  t.id,
                  t.client_name,
                  t.issue_description,
                  new Date(t.submitted_at).toLocaleDateString('fr-FR'),
                  t.status,
                  t.status_reason || ''
                ])
              ].map(row => row.join(';')).join('\n');
              
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `tickets_${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
            }}
            style={{
              padding: '10px 20px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            📥 Exporter en CSV
          </button>
        </div>
      )}
    </div>
  );
};
  const MaterialsManagement = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ticket_materials')
        .select('*')
        .order('requested_at', { ascending: false });
      
      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteMaterial = async (materialId, materialName) => {
    if (!window.confirm(`Supprimer "${materialName}"?`)) return;
    
    try {
      const { error } = await supabaseAdmin
        .from('ticket_materials')
        .delete()
        .eq('id', materialId);
      
      if (error) throw error;
      
      // Refresh the list
      fetchMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      alert('Erreur lors de la suppression');
    }
  };

  return (
    <div className="simple-materials" style={{ 
      background: 'white', 
      padding: '20px', 
      borderRadius: '8px',
      border: '1px solid #ddd',
      marginTop: '20px'
    }}>
      <h2> Matériels à Commander</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <p>Les managers ajoutent les matériels manquants ici. Supprimez les quand ils sont reçus.</p>
        <button 
          onClick={fetchMaterials}
          style={{ 
            padding: '8px 15px', 
            background: '#6c757d', 
            color: 'white', 
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
           Actualiser
        </button>
      </div>

      {loading ? (
        <p>Chargement...</p>
      ) : materials.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
          Aucun matériel à commander
        </p>
      ) : (
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          border: '1px solid #ddd'
        }}>
          <thead>
            <tr style={{ background: '#f2f2f2' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Matériel</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Quantité</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Date Demande</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Statut</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {materials.map(material => (
              <tr key={material.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>
                  <strong>{material.material_name}</strong>
                </td>
                <td style={{ padding: '10px' }}>
                  {material.quantity || 1}
                </td>
                <td style={{ padding: '10px' }}>
                  {new Date(material.requested_at).toLocaleDateString('fr-FR')}
                  <br/>
                  <small style={{ color: '#666' }}>
                    {new Date(material.requested_at).toLocaleTimeString('fr-FR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </small>
                </td>
                <td style={{ padding: '10px' }}>
                  <span style={{ 
                    color: material.fulfilled ? '#28a745' : '#dc3545',
                    fontWeight: 'bold'
                  }}>
                    {material.fulfilled ? '✅ Fourni' : '⏳ En attente'}
                  </span>
                </td>
                <td style={{ padding: '10px' }}>
                  <button 
                    onClick={() => deleteMaterial(material.id, material.material_name)}
                    style={{ 
                      background: '#dc3545', 
                      color: 'white', 
                      border: 'none', 
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
const AttendanceManagement = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchAttendance = async () => {
      if (!selectedDate) {
    alert('Veuillez sélectionner une date');
    return;
  }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_checkins')
        .select(`
          *,
          companies(name)
        `)
        .eq('checkin_date', selectedDate)
        .order('checkin_time', { ascending: false });
      
      if (error) throw error;
      setAttendanceData(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  const missingCheckouts = attendanceData.filter(a => !a.checkout_time).length;
  const presentCount = attendanceData.length;

  return (
    <div className="attendance-management">
      <h2> Pointage du Personnel</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '10px' }}>Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{ padding: '8px' }}
        />
        <button 
          onClick={fetchAttendance}
          style={{ marginLeft: '10px', padding: '8px 15px' }}
        >
           Actualiser
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        <div style={{ background: '#e9ecef', padding: '15px', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', color: '#495057' }}>Présents</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{presentCount}</div>
        </div>
        <div style={{ 
          background: missingCheckouts > 0 ? '#fff3cd' : '#d4edda', 
          padding: '15px', 
          borderRadius: '6px' 
        }}>
          <div style={{ fontSize: '12px', color: missingCheckouts > 0 ? '#856404' : '#155724' }}>
            Fin de journée manquante
          </div>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 'bold',
            color: missingCheckouts > 0 ? '#856404' : '#155724'
          }}>
            {missingCheckouts}
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p>Chargement...</p>
      ) : attendanceData.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          Aucun pointage pour {selectedDate}
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f2f2f2' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Entreprise</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Employé</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Arrivée</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Départ</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {attendanceData.map((record) => (
              <tr key={record.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>
                  {record.companies?.name || `Entreprise #${record.company_id}`}
                </td>
                <td style={{ padding: '10px' }}>
                  <strong>{record.employee_name}</strong>
                </td>
                <td style={{ padding: '10px' }}>
                  {record.checkin_time || '--:--'}
                </td>
                <td style={{ padding: '10px' }}>
                  {record.checkout_time || (
                    <span style={{ color: '#dc3545', fontWeight: 'bold' }}>
                       Manquant
                    </span>
                  )}
                </td>
                <td style={{ padding: '10px' }}>
                  {record.checkout_time ? (
                    <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                       Complété
                    </span>
                  ) : (
                    <span style={{ color: '#ffc107', fontWeight: 'bold' }}>
                       En cours
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Export */}
      {attendanceData.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <button            onClick={() => {
              const csv = [
                ['Entreprise', 'Employé', 'Arrivée', 'Départ', 'Statut'],
                ...attendanceData.map(r => [
                  r.companies?.name || `Entreprise #${r.company_id}`,
                  r.employee_name,
                  r.checkin_time,
                  r.checkout_time || 'MANQUANT',
                  r.checkout_time ? 'Complété' : 'En cours'
                ])
              ].map(row => row.join(',')).join('\n');
              
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `pointage_${selectedDate}.csv`;
              a.click();
            }}
            style={{ padding: '10px 15px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            📥 Exporter en CSV
          </button>
        </div>
      )}
    </div>
  );
};
  return (
    <div className="admin-container">
        {passwordChangeModal.open && <PasswordChangeModal />}
        
      <div className="admin-tabs">
        <button 
          onClick={() => setCurrentSection('overview')}
          className={currentSection === 'overview' ? 'active' : ''}
        >
          Overview
        </button>
         <button 
    onClick={() => setCurrentSection('clients')}
    className={currentSection === 'clients' ? 'active' : ''}
  >
     Gestion Clients
  </button>
    <button onClick={() => setCurrentSection('materials')}> Matériels</button>
      <button onClick={() => setCurrentSection('attendance')}> Pointage</button>
       <button onClick={() => setCurrentSection('tickets')}> Tickets</button>
  <button onClick={() => setCurrentSection('inventory')}> Inventaire</button>
      </div>
      

      <header className="admin-header">
        <h1>Tableau de Bord Admin</h1>
        
        <div className="admin-security">
          <button 
            onClick={() => setShowPasswordReset(!showPasswordReset)}
            className="password-reset-btn"
          >
            Voir/Changer les Mots de Passe Lot
          </button>
          
          {showPasswordReset && (
            <div className="password-reset-form">
              <h4>Changer mot de passe d'un lot spécifique</h4>
              
              <div className="form-group">
                <label>Sélectionner le lot:</label>
                <select
                  value={selectedLotForPassword || ''}
                  onChange={(e) => setSelectedLotForPassword(e.target.value)}
                  className="lot-select"
                >
                  <option value="">-- Choisir un lot --</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
                
              </div>
              
             {selectedLotForPassword && (
  <div className="current-password-info">
    <p>
      <strong>Entreprise sélectionnée:</strong> {
        companies.find(c => c.id == selectedLotForPassword)?.name
      }
    </p>
  </div>
)}
              
              <div className="form-group">
                <label>Nouveau mot de passe pour {
                  selectedLotForPassword ? companies.find(c => c.id == selectedLotForPassword)?.name : 'ce lot'
                }:</label>
                <input
                  type="password"
                  value={newEmployeePassword}
                  onChange={(e) => setNewEmployeePassword(e.target.value)}
                  placeholder="Entrez le nouveau mot de passe"
                  disabled={!selectedLotForPassword}
                />
              </div>
              
              <div className="form-buttons">
                <button 
                  onClick={resetEmployeePassword}
                  className="nav-button"
                  disabled={!selectedLotForPassword || !newEmployeePassword}
                >
                  Changer mot de passe pour {selectedLotForPassword ? 
                    companies.find(c => c.id == selectedLotForPassword)?.name : 'ce lot'}
                </button>
                <button 
                  onClick={() => {
                    setShowPasswordReset(false);
                    setSelectedLotForPassword('');
                    setNewEmployeePassword('');
                    setPasswordResetMessage('');
                  }}
                  className="nav-button back"
                >
                  Annuler
                </button>
              </div>
              <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
    <button 
      onClick={() => setPasswordChangeModal({
        open: true,
        userType: 'manager',
        newPassword: '',
        confirmPassword: '',
        message: ''
      })}
      className="password-reset-btn"
      style={{ background: '#007bff' }}
    >
      🔑 Changer MDP Manager
    </button>
    
    <button 
      onClick={() => setPasswordChangeModal({
        open: true,
        userType: 'inventory',
        newPassword: '',
        confirmPassword: '',
        message: ''
      })}
      className="password-reset-btn"
      style={{ background: '#28a745' }}
    >
      🔑 Changer MDP Inventaire
    </button>
  </div>
🎯 3. Add Password Change Modal Compo
              {passwordResetMessage && (
                <div className={`message ${passwordResetMessage.includes('mis à jour') ? 'success' : 'error'}`}>
                  {passwordResetMessage}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="admin-filters">
          <div className="date-mode-selection">
            <label>Mode:</label>
            <select 
              value={dateRangeMode} 
              onChange={(e) => {
                const newMode = e.target.value;
                setDateRangeMode(newMode);
                if (newMode === 'range') {
                  setSelectedDate('');
                  setStartDate('');
                  setEndDate('');
                } else {
                  setStartDate('');
                  setEndDate('');
                }
              }}
            >
              <option value="single">Date Unique</option>
              <option value="range">Plage de Dates</option>
            </select>
          </div>
          
          {dateRangeMode === 'single' ? (
            <div className="date-selection">
              <label>Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          ) : (
            <>
              <div className="date-range-selection">
                <div className="date-input-group">
                  <label>Du:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="date-input-group">
                  <label>Au:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="range-action-buttons">
                <button 
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="clear-range-btn"
                  style={{
                    background: '#666',
                    color: 'white',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Effacer
                </button>
              </div>
            </>
          )}

          <div className="view-mode-selection">
            <label>Vue:</label>
            <select value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
              <option value="current">Données Actuelles</option>
              <option value="history">Historique Validé</option>
            </select>
          </div>
        </div>
        
        <div className="admin-export-buttons">
          <button onClick={exportAllAsHTML} className="export-pdf-button">
           🔔 Exporter Tout pour PDF
          </button>
          <p style={{fontSize: '12px', color: '#666', margin: '5px 0 0 0'}}>
            Cliquez puis utilisez "Imprimer" → "Enregistrer au format PDF"
          </p>
        </div>
      </header>

      <main className="admin-main">
  {currentSection === 'overview' ? (
    <>
      {loading ? (
        <div className="loading">Chargement des données...</div>
      ) : (dateRangeMode === 'single' && selectedDate) || (dateRangeMode === 'range' && startDate && endDate) ? (
        <div className="overview-table">
          <div className="view-mode-indicator">
            <h3>
              {viewMode === 'current' ? 'Données Actuelles' : 'Historique Validé'} - 
              {dateRangeMode === 'single' ? selectedDate : `${startDate} au ${endDate}`}
            </h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>Entreprise</th>
                <th>Tâches Complétées</th>
                <th>Taux Completion</th>
                <th>Rapports Dégâts</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminData.map((item) => (
                <React.Fragment key={item.company.id}>
                  <tr className={item.hasDamageReports ? 'has-damage' : ''}>
                    <td><strong>{item.company.name}</strong></td>
                    <td>
                      {item.completedTasks}/{item.totalTasks}
                      <span style={{
                        color: item.tasksMissingFromHistory > 0 ? '#ff9800' : '#4CAF50',
                        marginLeft: '5px',
                        fontSize: '0.8em'
                      }}>
                        ({item.tasksMissingFromHistory} manquant)
                      </span>
                    </td>
                    <td>{item.completionRate}%</td>
                    <td>
                      {item.hasDamageReports ? (
                        <button 
                          onClick={() => toggleDamageReports(item.company.id)}
                          className="damage-toggle-btn"
                        >
                          {item.damageReportsCount} rapport(s) ▼
                        </button>
                      ) : (
                        'Aucun'
                      )}
                    </td>
                    <td>
                      <button 
                        onClick={() => setSelectedCompany(item.company)}
                        className="view-details-btn"
                      >
                        Voir Tous les Détails
                      </button>
                    </td>
                  </tr>
                  
                  {expandedDamageReports[item.company.id] && item.damageReports.length > 0 && (
                    <tr className="damage-details-row">
                      <td colSpan="5">
                        <div className="damage-reports-expanded">
                          <h4>Détails des Rapports de Dégâts - {item.company.name}</h4>
                          {item.damageReports.map((report, index) => (
                            <div key={report.id} className="damage-report-card">
                              <div className="damage-report-header">
                                <strong>Rapport #{index + 1}</strong>
                                <span className="damage-time">{report.heure_debut} - {report.heure_fin}</span>
                              </div>
                              
                              <div className="damage-description">
                                <strong>Description:</strong> {report.description_degat}
                              </div>
                              
                              <div className="damage-photos">
                                <strong>Photos:</strong>
                                <div className="photo-gallery">
                                  {report.photo_avant_url && (
                                    <div className="photo-item">
                                      <span>Avant:</span>
                                      <a href={report.photo_avant_url} target="_blank" rel="noopener noreferrer">
                                        <img src={report.photo_avant_url} alt="Avant réparation" className="photo-thumbnail" />
                                      </a>
                                    </div>
                                  )}
                                  {report.photo_apres_url && (
                                    <div className="photo-item">
                                      <span>Après:</span>
                                      <a href={report.photo_apres_url} target="_blank" rel="noopener noreferrer">
                                        <img src={report.photo_apres_url} alt="Après réparation" className="photo-thumbnail" />
                                      </a>
                                    </div>
                                  )}
                                  {!report.photo_avant_url && !report.photo_apres_url && (
                                    <span className="no-photos">Aucune photo</span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="damage-meta">
                                <small>
                                  {viewMode === 'current' 
                                    ? `Créée le: ${new Date(report.created_at).toLocaleDateString('fr-FR')}`
                                    : `Validée le: ${new Date(report.validated_at).toLocaleDateString('fr-FR')}`
                                  }
                                </small>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="select-date-prompt">
          <p>
            {dateRangeMode === 'single' 
              ? 'Veuillez sélectionner une date pour voir l\'overview'
              : 'Veuillez sélectionner une plage de dates (Du/Au)'
            }
          </p>
        </div>
 )}
    </>
  ) : currentSection === 'clients' ? (
    <ClientManagement />
  ) : currentSection === 'materials' ? (
    <MaterialsManagement />
  ) : currentSection === 'attendance' ? (  
    <AttendanceManagement />
  ) : currentSection === 'tickets' ? (
    <TicketsManagement />
  ) : currentSection === 'inventory' ? (  
    <InventoryView />                     
  ) : null}
</main>
    </div>
  );
}

export default Admin;