import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from './supabase';
import { useLocation } from 'react-router-dom';

function DamageReports({user}) {
  const [showDamageForm, setShowDamageForm] = useState(false);
  const [damageReports, setDamageReports] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  
  const [selectedCompany, setSelectedCompany] = useState(
    query.get('company') || (user?.companyId || '')
  );

  const [selectedDate, setSelectedDate] = useState(
    query.get('date') || new Date().toISOString().split('T')[0]
  );

  const newDamageRef = useRef({
    description: '',
    startTime: '',
    endTime: '',
    beforePhoto: null,
    afterPhoto: null
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchDamageReports();
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (user?.role === 'employee' && user?.companyId && companies.length > 0) {
      const companyExists = companies.find(c => c.id == user.companyId);
      if (companyExists && !selectedCompany) {
        setSelectedCompany(user.companyId);
      }
    }
  }, [companies, user, selectedCompany]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase.from('companies').select('*');
      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.log(error);
    }
  };

const fetchDamageReports = async () => {
  if (!selectedCompany) return;
  
  setLoading(true);
  try {
    // Just get all active drafts
    const { data, error } = await supabase
      .from('signalements_degats')
      .select('*')
      .eq('id_entreprise', selectedCompany)
      .eq('status', 'draft')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    setDamageReports(data || []);
  } catch (error) {
    console.log(error);
  } finally {
    setLoading(false);
  }
};
  const uploadImage = async (file, folder, fileName) => {
    try {
      const { data, error } = await supabase.storage
        .from('damage-reports')
        .upload(`${folder}/${fileName}`, file);
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from('damage-reports')
        .getPublicUrl(data.path);
      
      return urlData.publicUrl;
    } catch (error) {console.log(error);
      return null;
      
    }
  };

const submitDamageReport = async (damageData, status = 'draft') => {
  try {
    let beforePhotoUrl = null;
    let afterPhotoUrl = null;

    // Upload photos if any
    if (damageData.beforePhoto) {
      beforePhotoUrl = await uploadImage(
        damageData.beforePhoto, 
        'before', 
        `before-${Date.now()}.jpg`
      );
    }

    if (damageData.afterPhoto) {
      afterPhotoUrl = await uploadImage(
        damageData.afterPhoto,
        'after',
        `after-${Date.now()}.jpg`
      );
    }

    // If submitting, save to history and DELETE from main table
    if (status === 'submitted') {
      // 1. First save to damage_history
      const { error: historyError } = await supabase
        .from('damage_history')
        .insert([{
          id_entreprise: selectedCompany,
          description_degat: damageData.description,
          heure_debut: damageData.startTime,
          heure_fin: damageData.endTime,
          photo_avant_url: beforePhotoUrl,
          photo_apres_url: afterPhotoUrl,
          report_date: selectedDate,
          created_at: new Date().toISOString()
        }]);

      if (historyError) throw historyError;

      // 2. DELETE from signalements_degats if it's a draft
      const { data: existingDraft } = await supabase
        .from('signalements_degats')
        .select('id')
        .eq('id_entreprise', selectedCompany)
        .eq('report_date', selectedDate)
        .eq('status', 'draft')
        .eq('archivé', false)
        .maybeSingle();

      if (existingDraft?.id) {
        const { error: deleteError } = await supabase
          .from('signalements_degats')
          .delete()
          .eq('id', existingDraft.id);
        
        if (deleteError) throw deleteError;
      }

      alert('Rapport soumis et supprimé de la vue employé!');
      
    } else {
      // DRAFT: Save/update in signalements_degats
      const reportData = {
        id_entreprise: selectedCompany,
        description_degat: damageData.description,
        heure_debut: damageData.startTime,
        heure_fin: damageData.endTime,
        photo_avant_url: beforePhotoUrl,
        photo_apres_url: afterPhotoUrl,
        report_date: selectedDate,
        status: 'draft',
        archivé: false
      };

      const { data: existingDraft } = await supabase
        .from('signalements_degats')
        .select('id')
        .eq('id_entreprise', selectedCompany)
        .eq('report_date', selectedDate)
        .eq('status', 'draft')
        .eq('archivé', false)
        .maybeSingle();

      if (existingDraft?.id) {
        await supabase
          .from('signalements_degats')
          .update(reportData)
          .eq('id', existingDraft.id);
      } else {
        await supabase
          .from('signalements_degats')
          .insert([reportData]);
      }

      alert('Brouillon sauvegardé!');
    }

    // Reset form and refresh
    newDamageRef.current = { 
      description: '', 
      startTime: '', 
      endTime: '', 
      beforePhoto: null, 
      afterPhoto: null 
    };
    setShowDamageForm(false);
    fetchDamageReports();
    
  } catch (error) {
    alert('Erreur: ' + error.message);
  }
};


  const editDamageReport = async (report) => {
    try {
      if (report.report_date !== selectedDate && report.status === 'draft') {
        const { error: updateError } = await supabase
          .from('signalements_degats')
          .update({ report_date: selectedDate })
          .eq('id', report.id);
        
        if (updateError) throw updateError;
        
        fetchDamageReports();
      }
      
      newDamageRef.current = {
        description: report.description_degat || '',
        startTime: report.heure_debut || '',
        endTime: report.heure_fin || '',
        beforePhoto: null,
        afterPhoto: null
      };
      
      setShowDamageForm(true);
      
    } catch (error) {
      alert('Erreur lors de la mise à jour du brouillon: ' + error.message);
    }
  };

  const DamageReportForm = () => (
    <div className="damage-form">
      <h4>Nouveau Rapport de Dégât</h4>
      
      <div className="form-group">
        <label>Description du dégât:</label>
        <textarea
          defaultValue={newDamageRef.current.description}
          onChange={(e) => newDamageRef.current.description = e.target.value}
          placeholder="Décrivez ce qui est endommagé..."
          rows="3"
        />
      </div>

      <div className="time-inputs">
        <div className="form-group">
          <label>Heure début:</label>
          <input
            type="time"
            defaultValue={newDamageRef.current.startTime}
            onChange={(e) => newDamageRef.current.startTime = e.target.value}
          />
        </div>
        
        <div className="form-group">
          <label>Heure fin:</label>
          <input
            type="time"
            defaultValue={newDamageRef.current.endTime}
            onChange={(e) => newDamageRef.current.endTime = e.target.value}
          />
        </div>
      </div>

      <div className="photo-uploads">
        <div className="form-group">
          <label>Photo avant réparation:</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => newDamageRef.current.beforePhoto = e.target.files[0]}
          />
        </div>
        
        <div className="form-group">
          <label>Photo après réparation:</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => newDamageRef.current.afterPhoto = e.target.files[0]}
          />
        </div>
      </div>

    <div className="form-buttons">
  {/* BUTTON 1: SAVE AS DRAFT */}
  <button onClick={() => {
    if (!newDamageRef.current.description.trim()) {
      alert('Ajoutez une description avant de sauvegarder');
      return;
    }
    submitDamageReport({
      description: newDamageRef.current.description,
      startTime: newDamageRef.current.startTime,
      endTime: newDamageRef.current.endTime,
      beforePhoto: newDamageRef.current.beforePhoto,
      afterPhoto: newDamageRef.current.afterPhoto
    }, 'draft');  // ← 'draft' NOT 'submitted'
  }} className="nav-button draft" style={{background: '#28a745'}}>
     Sauvegarder comme Brouillon
  </button>

  {/* BUTTON 2: SUBMIT */}
  <button onClick={() => {
    if (!newDamageRef.current.description.trim()) {
      alert('Ajoutez une description avant de soumettre');
      return;
    }
    
    const confirmSubmit = window.confirm(
      'Êtes-vous sûr de vouloir soumettre ce rapport?\n\n' +
      ' Il sera sauvegardé dans l\'historique\n' +
      ' Il sera supprimé de votre vue\n\n' +
      'Cliquez sur OK pour confirmer.'
    );
    
    if (confirmSubmit) {
      submitDamageReport({
        description: newDamageRef.current.description,
        startTime: newDamageRef.current.startTime,
        endTime: newDamageRef.current.endTime,
        beforePhoto: newDamageRef.current.beforePhoto,
        afterPhoto: newDamageRef.current.afterPhoto
      }, 'submitted');  // ← 'submitted'
    }
  }} className="nav-button submit" style={{background: '#007bff'}}>
    Soumettre le Rapport
  </button>


  <button onClick={() => setShowDamageForm(false)} className="nav-button back" style={{background: '#6c757d'}}>
    Annuler
  </button>
</div>
    </div>
  );

  const DamageReportsTable = () => (
    <div className="damage-reports-table">
      <h4>Tous les Rapports</h4>
      
      {damageReports.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Statut</th>
              <th>Description</th>
              <th>Heure Début</th>
              <th>Heure Fin</th>
              <th>Date Dégât</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {damageReports.map(report => (
              <tr key={report.id} className={report.status === 'draft' ? 'draft-row' : ''}>
                <td>
                  <span className={`status-badge ${report.status}`}>
                    {report.status === 'draft' ? 'Brouillon' : 'Soumis'}
                  </span>
                </td>
                
                <td>{report.description_degat || 'Pas de description'}</td>
                <td>{report.heure_debut || '--:--'}</td>
                <td>{report.heure_fin || '--:--'}</td>
                
                <td>{report.report_date}</td>
                
                <td>
                  {report.status === 'draft' && (
                    <button 
                      onClick={async () => await editDamageReport(report)}
                      className="nav-button"
                    >
                      Modifier
                    </button>
                  )}
                  
                 
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Aucun rapport de dégât pour cette période.</p>
      )}
    </div>
  );

  return (
    <div className="damage-reports-page">
      <div className="page-header">
        <h1>Rapports de Dégâts</h1>
        <Link to="/" className="nav-button">← Retour aux Tâches</Link>
      </div>

      <div className="damage-filters">
        <div className="form-group">
          <label>Entreprise:</label>
          
          {user?.role === 'employee' ? (
            <div className="company-info">
              <strong>{companies.find(c => c.id == user.companyId)?.name || 'Chargement...'}</strong>
              <input type="hidden" value={user.companyId} />
            </div>
          ) : (
            <select 
              value={selectedCompany} 
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="company-select"
            >
              <option value="">-- Choisir une entreprise --</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="form-group">
          <label>Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
          />
        </div>
      </div>

      <div className="damage-reports-section">
        <button 
          onClick={() => setShowDamageForm(true)} 
          className="nav-button"
          disabled={!selectedCompany}
        >
          + Nouveau rapport de dégât
        </button>

        {showDamageForm && <DamageReportForm />}
        
        {loading ? (
          <div className="loading">Chargement...</div>
        ) : selectedCompany ? (
          <DamageReportsTable />
        ) : (
          <p className="select-company-prompt">
            {user?.role === 'admin' 
              ? 'Veuillez sélectionner une entreprise pour voir les rapports.'
              : 'Chargement des informations entreprise...'
            }
          </p>
        )}
      </div>
    </div>
  );
}

export default DamageReports;