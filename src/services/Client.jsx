import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

function Client({ user }) {
  const [probleme, setProbleme] = useState('');
  const [photo, setPhoto] = useState(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [message, setMessage] = useState('');
  const [clientTickets, setClientTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  // Fetch tickets
  const fetchClientTickets = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('client_user_id', user.id)
        .eq('archived', false)
        .order('submitted_at', { ascending: false });
      
      if (error) throw error;
      
      setClientTickets(data || []);
      
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchClientTickets();
  
    const ticketsChannel = supabase
      .channel(`client-tickets-${user.id}`)
      .on(
        'POSTGRES_CHANGES',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `client_user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
          
            setClientTickets(prev => [payload.new, ...prev]);
          } 
          else if (payload.eventType === 'UPDATE') {
            // Ticket updated by manager
            setClientTickets(prev =>
              prev.map(t => t.id === payload.new.id ? payload.new : t)
            );
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(ticketsChannel);
    };
  }, [user.id]);

  const soumettreTicket = async (e) => {
    e.preventDefault();
    if (!probleme.trim()) {
      setMessage('Veuillez décrire le problème');
      return;
    }

    setEnvoiEnCours(true);
    setMessage('');

    try {
      let urlPhoto = null;
      if (photo) {
        const extension = photo.name.split('.').pop();
        const nomFichier = `${user.id}_${Date.now()}.${extension}`;
        
        const { data: donneesUpload, error: erreurUpload } = await supabase.storage
          .from('client-tickets')
          .upload(nomFichier, photo);

        if (erreurUpload) throw erreurUpload;

        const { data: donneesUrl } = supabase.storage
          .from('client-tickets')
          .getPublicUrl(donneesUpload.path);
        
        urlPhoto = donneesUrl.publicUrl;
      }

      const { data: newTicket, error: erreurTicket } = await supabase
        .from('tickets')
        .insert({
          client_name: user.companyName,
          issue_description: probleme,
          photo_url: urlPhoto,
          submitted_at: new Date().toISOString(),
          status: 'pending',
          client_user_id: user.id
        })
        .select()      
        .single();    
        

      if (erreurTicket) throw erreurTicket;

      setClientTickets(prev => [newTicket, ...prev]);
      
      setMessage('✅ Ticket soumis avec succès ! Le manager vous contactera.');
      setProbleme('');
      setPhoto(null);

    } catch (error) {
      console.error('Erreur ticket:', error);
      setMessage('❌ Erreur: ' + error.message);
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const archiveCompletedTicket = async (ticketId, ticketDescription) => {
    if (!window.confirm(`Archive this completed ticket?\n\n"${ticketDescription.substring(0, 80)}${ticketDescription.length > 80 ? '...' : ''}"`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
          status: 'archived'
        })
        .eq('id', ticketId)
        .eq('client_user_id', user.id)
        .eq('status', 'completed');

      if (error) throw error;

      // Remove from local state
      setClientTickets(prev => prev.filter(t => t.id !== ticketId));
      alert('✅ Ticket archived!');
      
    } catch (error) {
      console.error('Error archiving ticket:', error);
      alert('❌ Error: Could not archive ticket.');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  if (user.role !== 'client') {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Accès Refusé</h2>
        <p>Cette page est réservée aux clients.</p>
      </div>
    );
  }

  return (
    <div className="client-dashboard" style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <h1>Portail Client: {user.companyName}</h1>
      <p>Bienvenue ! Soumettez vos demandes de maintenance et suivez vos tickets.</p>
      
      {/* Ticket Submission Form */}
      <div className="formulaire-ticket" style={{ 
        background: '#f5f5f5', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '30px'
      }}>
        <h2>📋 Nouvelle Demande de Maintenance</h2>
        
        {message && (
          <div style={{
            padding: '10px',
            background: message.includes('✅') ? '#d4edda' : '#f8d7da',
            color: message.includes('✅') ? '#155724' : '#721c24',
            borderRadius: '4px',
            marginBottom: '15px'
          }}>
            {message}
          </div>
        )}
        
        <form onSubmit={soumettreTicket}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Description du Problème: *
            </label>
            <textarea
              value={probleme}
              onChange={(e) => setProbleme(e.target.value)}
              placeholder="Décrivez ce qui doit être réparé..."
              rows="4"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px'
              }}
              disabled={envoiEnCours}
              required
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Photo (Optionnelle):
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files[0])}
              style={{ display: 'block' }}
              disabled={envoiEnCours}
            />
            {photo && (
              <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                Sélectionné: {photo.name} ({(photo.size / 1024).toFixed(1)} KB)
              </small>
            )}
          </div>
          
          <button
            type="submit"
            disabled={envoiEnCours || !probleme.trim()}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: envoiEnCours ? 'not-allowed' : 'pointer',
              opacity: envoiEnCours ? 0.7 : 1
            }}
          >
            {envoiEnCours ? 'Envoi en cours...' : 'Soumettre le Ticket'}
          </button>
        </form>
      </div>
      
      {/* Client's Ticket History */}
      <div className="client-tickets" style={{ 
        background: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <h2>📊 Vos Tickets ({clientTickets.length})</h2>
        
        {loadingTickets ? (
          <p>Chargement de vos tickets...</p>
        ) : clientTickets.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
            Vous n'avez pas encore soumis de tickets.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr style={{ background: '#f2f2f2' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Soumis le</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Statut</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Commentaire</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Photo</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clientTickets.map(ticket => (
                  <tr key={ticket.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>{ticket.issue_description}</td>
                    <td style={{ padding: '10px' }}>{formatDate(ticket.submitted_at)}</td>
                    <td style={{ padding: '10px' }}>
                      <span className="status-badge" style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        background: 
                          ticket.status === 'completed' ? '#d4edda' :
                          ticket.status === 'assigned' ? '#fff3cd' :
                          ticket.status === 'archived' ? '#e9ecef' :  
                          '#f8d7da',
                        color: 
                          ticket.status === 'completed' ? '#155724' :
                          ticket.status === 'assigned' ? '#856404' :
                          ticket.status === 'archived' ? '#495057' :  
                          '#721c24'
                      }}>
                        {ticket.status === 'completed' ? 'Terminé' :
                         ticket.status === 'assigned' ? 'Assigné' :
                         ticket.status === 'archived' ? 'Archivé' :  
                         'En attente'}
                      </span>
                    </td>
                    <td style={{ padding: '10px', fontSize: '13px', color: '#666' }}>
                      {ticket.status_reason || '—'}
                    </td>
                    <td style={{ padding: '10px' }}>
                      {ticket.photo_url ? (
                        <a href={ticket.photo_url} target="_blank" rel="noopener noreferrer">
                          <img 
                            src={ticket.photo_url} 
                            alt="Ticket" 
                            className="photo-thumbnail"
                            style={{ width: '50px', borderRadius: '4px' }}
                          />
                        </a>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '10px' }}>
                      {ticket.status === 'completed' && !ticket.archived ? (
                        <button
                          onClick={() => archiveCompletedTicket(ticket.id, ticket.issue_description)}
                          style={{
                            background: 'linear-gradient(135deg, #6c757d, #495057)',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                           Delete
                        </button>
                      ) : ticket.archived ? (
                        <span style={{ color: '#6c757d', fontSize: '11px' }}>
                           Archived
                        </span>
                      ) : (
                        <span style={{ color: '#6c757d', fontSize: '11px' }}>
                          {ticket.status === 'assigned' ? 'En cours' : 'En attente'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Client;