 import React, { useState, useEffect } from 'react';
import Login from './services/login';
import Navbar from './services/navbar';
import Admin from './services/admin';
import './App.css';
import { supabase } from './services/supabase';
import { Routes, Route , Link} from 'react-router-dom';
import DamageReports from './services/DamageReports';
import Client from './services/Client';
import ManagerDashboard from './services/ManagerDashboard'; 
import InventoryWorker from './services/InventoryWorker';
function App() {
  const [user, setUser] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [companies, setCompanies] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState('employee');
const [employeeName, setEmployeeName] = useState('');


  const handleLogin = (userData) => {
    setUser(userData);
    setCurrentView(userData.role === 'admin' ? 'admin' : 'employee');
    setCurrentStep(1);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('employee');
    setCurrentStep(1);
    setSelectedCompany('');
    setSelectedDate('');
    
    localStorage.removeItem('selectedDate');
    localStorage.removeItem('selectedCompany');
    
    window.location.href = '/';
  };

  const getRotatingWeekNumber = (date) => {
    const referenceDate = new Date('2025-12-01');
    const referenceWeek = 1;

    const diffInTime = date.getTime() - referenceDate.getTime();
    const diffInDays = Math.floor(diffInTime / (1000 * 60 * 60 * 24));
    const diffInWeeks = Math.floor(diffInDays / 7);
    
    let weekNumber = ((referenceWeek + diffInWeeks - 1) % 4) + 1;
    
    if (weekNumber < 1) weekNumber += 4;
    
    return weekNumber;
  };

  const getDayName = (date) => {
    const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    return days[date.getDay()];
  };

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase.from('companies').select('*');
      if (error) throw error;
      setCompanies(data || []);
    } catch (err) {
      console.log(err);
     
      setCompanies([
        { id: 1, name: 'LOT ELECTRICITE' }, { id: 2, name: 'LOT CLIMATISATION' },
        { id: 3, name: 'LOT PLOMBERIE' }, { id: 4, name: 'LOT VENTILATION' },
        { id: 5, name: 'LOT MENUISERIE' }, { id: 6, name: 'LOT PEINTURE' },
        { id: 7, name: 'LOT VRD' }, { id: 8, name: 'LOT SSI' }
      ]);
    }
  };

  const fetchTasks = async () => {
    if (!selectedCompany || !selectedDate) return;
    setLoading(true);
    try {
      const dateObj = new Date(selectedDate);
      const weekNumber = getRotatingWeekNumber(dateObj);
      const dayName = getDayName(dateObj);

      const { data: existingTasks, error: existingError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id_entreprise', selectedCompany)
        .eq('date_exécution', selectedDate);

      if (existingError) throw existingError;

      if (existingTasks && existingTasks.length > 0) {
        setTasks(existingTasks);
      } else {
        const { data: templateTasks, error: templateError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id_entreprise', selectedCompany)
          .eq('numéro_semaine', weekNumber)
          .eq('jour_de_la_semaine', dayName)
          .is('date_exécution', null);

        if (templateError) throw templateError;

        if (templateTasks && templateTasks.length > 0) {
          const newTasks = await Promise.all(
            templateTasks.map(async (template) => {
              const { data: newTask, error: createError } = await supabase
                .from('tasks')
                .insert([{
                  id_entreprise: template.id_entreprise,
                  nom_tâche: template.nom_tâche,
                  jour_de_la_semaine: dayName,
                  numéro_semaine: weekNumber,
                  complété: false,
                  heure_début: null,
                  heure_fin: null,
                  remarques: null,
                  date_exécution: selectedDate
                }])
                .select()
                .single();

              if (createError) throw createError;
              return newTask;
            })
          );
          setTasks(newTasks);
        } else {
          setTasks([]);
        }
      }
    } catch (err) {
      setTasks([]);
       console.log(err);
    }
    setLoading(false);
  };

  const toggleTaskCompletion = async (taskId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      const { error } = await supabase
        .from('tasks')
        .update({ complété: newStatus })
        .eq('id', taskId);
      if (error) throw error;
      setTasks(tasks.map(task => task.id === taskId ? { ...task, complété: newStatus } : task));
    } catch (err) {
       console.log(err);
    }
  };

  const updateTaskTime = async (taskId, field, value) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ [field]: value })
        .eq('id', taskId);
      if (error) throw error;
      setTasks(tasks.map(task => task.id === taskId ? { ...task, [field]: value } : task));
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (user?.role === 'employee' && user?.companyId) {
      setSelectedCompany(user.companyId);
    }
  }, [user]);

  useEffect(() => {
    if (currentStep === 3 && selectedCompany && selectedDate) {
      fetchTasks();
    }
  }, [currentStep, selectedCompany, selectedDate]);

  const validateAndResetDay = async () => {
    try {
      if (!selectedCompany || !selectedDate) return;

      if (!window.confirm('Êtes-vous sûr de vouloir valider et réinitialiser cette journée? Les données seront sauvegardées dans l\'historique.')) {
        return;
      }

      const { data: currentTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('id_entreprise', selectedCompany)
        .eq('date_exécution', selectedDate);

      if (currentTasks && currentTasks.length > 0) {
        await supabase
          .from('task_history')
          .delete()
          .eq('id_entreprise', selectedCompany)
          .eq('date_exécution', selectedDate);

        const historyTasks = currentTasks.map(task => ({
          original_task_id: task.id,
          id_entreprise: task.id_entreprise,
          nom_tâche: task.nom_tâche,
          jour_de_la_semaine: task.jour_de_la_semaine,
          numéro_semaine: task.numéro_semaine,
          complété: task.complété,
          heure_début: task.heure_début,
          heure_fin: task.heure_fin,
          remarques: task.remarques,
          date_exécution: selectedDate
        }));

        await supabase.from('task_history').insert(historyTasks);
      }

      const { data: currentDamage } = await supabase
        .from('signalements_degats')
        .select('*')
        .eq('id_entreprise', selectedCompany)
        .eq('report_date', selectedDate)
        .eq('status', 'submitted')
        .eq('archivé', true);

      if (currentDamage && currentDamage.length > 0) {
        await supabase
          .from('damage_history')
          .delete()
          .eq('id_entreprise', selectedCompany)
          .eq('report_date', selectedDate);

        const historyDamage = currentDamage.map(report => ({
          original_damage_id: report.id,
          id_entreprise: report.id_entreprise,
          description_degat: report.description_degat,
          heure_debut: report.heure_debut,
          heure_fin: report.heure_fin,
          photo_avant_url: report.photo_avant_url,
          photo_apres_url: report.photo_apres_url,
          report_date: selectedDate,
          created_at: new Date().toISOString()
        }));

        await supabase.from('damage_history').insert(historyDamage);
      }

      const { error: tasksError } = await supabase
        .from('tasks')
        .update({
          complété: false,
          heure_début: null,
          heure_fin: null,
          remarques: null
        })
        .eq('id_entreprise', selectedCompany)
        .eq('date_exécution', selectedDate);

      if (tasksError) throw tasksError;

      fetchTasks();
      alert(`Journée validée! ${currentTasks?.filter(t => t.complété).length || 0}/${currentTasks?.length || 0} tâches sauvegardées.`);
      
    } catch (err) {
      alert('Erreur lors de la validation de la journée');
       console.log(err);
    }
  };

  const renderCompanySelection = () => {
    if (user?.role === 'employee' && user?.companyId) {
      const company = companies.find(c => c.id == user.companyId);
      return (
        <div className="step-container">
          <h2>Tâches - {company?.name}</h2>
          <div className="company-info">
            <p>Connecté en tant que: <strong>{company?.name}</strong></p>
          </div>
          <button onClick={() => setCurrentStep(2)} className="nav-button">
            Sélectionner la date →
          </button>
        </div>
      );
    }

    return (
      <div className="step-container">
        <h2>Sélectionner l'expertise</h2>
        <select 
          value={selectedCompany} 
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="company-select"
        >
          <option value="">-- Choisir une expertise --</option>
          {companies.map(company => (
            <option key={company.id} value={company.id}>{company.name}</option>
          ))}
        </select>
        <button 
          onClick={() => setCurrentStep(2)} 
          disabled={!selectedCompany}
          className="nav-button"
        >
          Continuer →
        </button>
      </div>
    );
  };

  const renderDateSelection = () => (
    <div className="step-container">
      <h2>Sélectionnez la date</h2>
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        className="date-input"
      />
      <div className="nav-buttons">
        <button onClick={() => setCurrentStep(1)} className="nav-button back">
          ← Retour
        </button>
        <button 
          onClick={() => setCurrentStep(3)} 
          disabled={!selectedDate}
          className="nav-button"
        >
          Continuer →
        </button>
      </div>
    </div>
  );
  const handleEmployeeCheckIn = async () => {
  if (!employeeName.trim()) {
    alert('Veuillez entrer votre nom');
    return;
  }

  console.log('Checking in:', {
    company: selectedCompany,
    name: employeeName,
    date: selectedDate
  });

  try {
  
    const { data: existing, error: checkError } = await supabase
      .from('employee_checkins')
      .select('id, checkin_time')
      .eq('company_id', selectedCompany)
      .eq('employee_name', employeeName.trim())
      .eq('checkin_date', selectedDate)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
     
      console.log('Already checked in at:', existing.checkin_time);
      alert(`Vous êtes déjà enregistré aujourd'hui (${existing.checkin_time})`);
      
      setCurrentStep(4); 
      return;
    }

    const currentTime = new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    console.log('Saving check-in at:', currentTime);

    const { data, error } = await supabase
      .from('employee_checkins')
      .insert({
        company_id: selectedCompany,
        employee_name: employeeName.trim(),
        checkin_date: selectedDate,
        checkin_time: currentTime,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      if (error.code === '23505') {
       
        alert('Vous êtes déjà enregistré pour aujourd\'hui');
      
        setCurrentStep(4);
        return;
      }
      throw error;
    }

    console.log('Check-in saved:', data);
    alert(`✅ Enregistré à ${currentTime}`);
   
    setCurrentStep(4); 
    
  } catch (error) {
    console.error('Check-in error:', error);
    alert('Erreur lors de l\'enregistrement: ' + error.message);
  }
};
const handleEndDay = async () => {
  if (!employeeName.trim()) {
    alert('Nom non enregistré. Retournez à l\'enregistrement.');
    setCurrentStep(3);
    return;
  }

  if (!selectedCompany || !selectedDate) {
    alert('Erreur: informations manquantes');
    return;
  }

  const confirmEnd = window.confirm(
    'Êtes-vous sûr de vouloir terminer votre journée?\n\n' +
    '✅ Votre heure de départ sera enregistrée\n' +
    '❌ Action définitive\n\n' +
    'Continuer?'
  );

  if (!confirmEnd) return;

  try {
    const currentTime = new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const { data, error } = await supabase
      .from('employee_checkins')
      .update({
        checkout_time: currentTime,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', selectedCompany)
      .eq('employee_name', employeeName.trim())
      .eq('checkin_date', selectedDate)
      .is('checkout_time', null)
      .select()
      .single();

    if (error) throw error;

    if (data) {
      alert(`✅ Fin de journée enregistrée à ${currentTime}`);
    } else {
      alert('ℹ️ Vous avez déjà enregistré la fin de journée aujourd\'hui');
    }
    
  } catch (error) {
    console.error('End day error:', error);
    alert('Erreur: ' + error.message);
  }
};
const renderEmployeeCheckIn = () => (
  <div className="step-container">
    <h2>📝 Enregistrement du Personnel</h2>
    
    <div className="checkin-info">
      <p><strong>Date:</strong> {selectedDate}</p>
      <p><strong>Entreprise:</strong> {companies.find(c => c.id == selectedCompany)?.name}</p>
    </div>
    
    <div className="form-group">
      <label>Votre nom complet:</label>
      <input
        type="text"
        value={employeeName}
        onChange={(e) => setEmployeeName(e.target.value)}
        placeholder="ex: Jean Dupont"
        style={{ padding: '10px', fontSize: '16px', width: '300px' }}
      />
    </div>
    
    <div className="nav-buttons">
      <button onClick={() => setCurrentStep(2)} className="nav-button back">
        ← Retour
      </button>
      <button 
        onClick={handleEmployeeCheckIn}
        disabled={!employeeName.trim()}
        className="nav-button"
      >
        Enregistrer et Continuer →
      </button>
    </div>
  </div>
);
  const renderTasksView = () => {
    const dateObj = new Date(selectedDate);
    const rotatingWeek = getRotatingWeekNumber(dateObj);
    const dayName = getDayName(dateObj);
    const dayNameFormatted = dayName.charAt(0).toUpperCase() + dayName.slice(1);

    return (
      <div className="step-container">
        <div className="navigation-header">
          <button onClick={() => setCurrentStep(3)} className="nav-button back">
            ← Retour
          </button>
          <h2>
            {companies.find(c => c.id == selectedCompany)?.name} - {new Date(selectedDate).toLocaleDateString('fr-FR')}
          </h2>
        </div>

        <div className="date-info">
          <h3>Semaine {rotatingWeek} - {dayNameFormatted}</h3>
          <p>Date: {selectedDate} | Rotation 4 semaines</p>
        </div>
   
        <div className="validate-section">
          <button onClick={validateAndResetDay} className="validate-button">
            Réinitialiser la Journée
          </button>
          <p className="validate-warning">
            Attention: Cette action remet à zéro toutes les tâches et rapports de dégâts pour cette journée.
          </p>
        </div>
        <div className="end-day-section" style={{ 
  marginTop: '20px', 
  padding: '15px', 
  background: '#f8f9fa', 
  borderRadius: '8px',
  border: '1px solid #dee2e6'
}}>
  <h4 style={{ marginTop: '0', color: '#495057' }}>🏁 Fin de Journée</h4>
  <button 
    onClick={handleEndDay}
    style={{
      padding: '10px 20px',
      background: '#dc3545',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: 'bold'
    }}
  >
    🔴 Terminer la Journée
  </button>
  <p style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
    Cliquez uniquement quand vous partez du travail
  </p>
</div>

        {loading ? (
          <div className="loading">Chargement des tâches...</div>
        ) : (
          <div className="tasks-table">
            <table>
              <thead>
                <tr>
                  <th>Tâche</th>
                  <th>Heure Début</th>
                  <th>Heure Fin</th>
                  <th>Remarques</th>
                  <th>Terminé</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id} className={task.complété ? 'completed' : ''}>
                    <td>{task.nom_tâche}</td>
                    <td>
                      <input
                        type="time"
                        value={task.heure_début || ''}
                        onChange={(e) => setTasks(tasks.map(t => t.id === task.id ? {...t, heure_début: e.target.value} : t))}
                        onBlur={(e) => updateTaskTime(task.id, 'heure_début', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        value={task.heure_fin || ''}
                        onChange={(e) => setTasks(tasks.map(t => t.id === task.id ? {...t, heure_fin: e.target.value} : t))}
                        onBlur={(e) => updateTaskTime(task.id, 'heure_fin', e.target.value)}
                      />
                    </td>
                    <td>
                      <textarea
                        value={task.remarques || ''}
                        onChange={(e) => setTasks(tasks.map(t => t.id === task.id ? {...t, remarques: e.target.value} : t))}
                        onBlur={(e) => updateTaskTime(task.id, 'remarques', e.target.value)}
                        placeholder="Notes..."
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={task.complété || false}
                        onChange={() => toggleTaskCompletion(task.id, task.complété)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="damage-reports-section">
          <h3>Dépannage et intervention</h3>
         <Link to={`/damage-reports?date=${selectedDate}&company=${selectedCompany}`} className="nav-button">
  + Nouveau rapport de dégât
</Link>
          <p style={{marginTop: '10px', color: '#666', fontSize: '14px'}}>
            Cliquez pour accéder à la page des rapports de dégâts
          </p>
        </div>
      </div>
    );
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      {user && (
        <Navbar 
          currentView={currentView}
          setCurrentView={setCurrentView}
          user={user}
          onLogout={handleLogout}
        />
      )}
      
   <Routes>
  {/* Damage Reports - Protected route */}
  <Route path="/damage-reports" element={
    user?.role === 'employee' ? (
      <DamageReports user={user} />
    ) : (
      <div style={{ padding: '20px' }}>
        <h2>Access Denied</h2>
        <p>Damage reports are for employees only.</p>
      </div>
    )
  } />
  <Route path="/inventory" element={
  user?.role === 'inventory_worker' ? (
    <InventoryWorker user={user} />
  ) : (
    <div style={{ padding: '20px' }}>
      <h2>Accès Refusé</h2>
      <p>Cette page est réservée au responsable d'inventaire.</p>
    </div>
  )
} />
  
  {/* Client route */}
  <Route path="/client" element={<Client user={user} />} />
  
  <Route path="/" element={
    !user ? (
      <Login onLogin={handleLogin} />
    ) : (
      <>
        <header className="app-header">
          <h1>Gestionnaire de Tâches Hebdomadaires</h1>
        </header>
 <main className="app-main">
  {console.log('DEBUG - User role:', user?.role)}
  
  {user.role === 'admin' ? (
    <Admin />
  ) : user.role === 'manager' ? (           
    <ManagerDashboard user={user} />        
  ) : user.role === 'client' ? (
    <Client user={user} />
  ) : user.role === 'inventory_worker' ? (

    <div style={{ 
      padding: '40px', 
      textAlign: 'center',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <h1> Système d'Inventaire</h1>
      <p style={{ fontSize: '18px', color: '#666', marginBottom: '30px' }}>
        Bienvenue <strong>{user.username}</strong>!<br/>
        Vous êtes connecté en tant que responsable d'inventaire.
      </p>
      
      <Link 
        to="/inventory" 
        style={{
          padding: '15px 30px',
          background: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '18px',
          fontWeight: 'bold',
          textDecoration: 'none',
          display: 'inline-block',
          cursor: 'pointer'
        }}
      >
         Aller à la page d'Inventaire
      </Link>
    </div>
  ) : (

    <>
      {currentStep === 1 && renderCompanySelection()}
      {currentStep === 2 && renderDateSelection()}
      {currentStep === 3 && renderEmployeeCheckIn()}  
      {currentStep === 4 && renderTasksView()}        
    </>
  )}
</main>
      </>
    )
  } />
</Routes>
    </div>
  );
}

export default App;