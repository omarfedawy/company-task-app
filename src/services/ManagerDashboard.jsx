import React, { useState, useEffect,useRef  } from 'react';
import { supabase } from './supabase';

function ManagerDashboard({ user }) {
  const [tickets, setTickets] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [materiaux, setMateriaux] = useState([]);
  const [nouveauMateriel, setNouveauMateriel] = useState('');
  const [quantite, setQuantite] = useState(1);
 

  const [messageModal, setMessageModal] = useState({
    open: false,
    ticketId: null,
    message: ''
  });


 const recupererDonnees = async () => {
  try {
 
    const { data: donneesTickets, error: erreurTickets } = await supabase
      .from('tickets')
      .select('*')
      .eq('archived', false)  
      .or('status.eq.pending,status.eq.assigned')  
      .order('submitted_at', { ascending: false });
      
      if (erreurTickets) throw erreurTickets;
      setTickets(donneesTickets || []);
      
      // Materials - FIXED: Remove requested_by column
      const { data: donneesMateriaux } = await supabase
        .from('ticket_materials')
        .select('id, material_name, quantity, requested_at, fulfilled')
        .order('requested_at', { ascending: false })
        .limit(10);
      
      setMateriaux(donneesMateriaux || []);
      
    } catch (erreur) {
      console.error('Erreur:', erreur);
    } finally {
      setChargement(false);
    }
  };

useEffect(() => {
  // Initial fetch
  recupererDonnees();
  
  const intervalId = setInterval(() => {
    console.log('🔄 Manager polling refresh...');
    recupererDonnees();
  }, 30000); // 30 seconds
  

const ticketsChannel = supabase
  .channel('manager-tickets')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'tickets' },
    (payload) => {
      console.log('Real-time update:', payload);
      
      if (payload.eventType === 'INSERT') {
        // Add new ticket if it's pending
        if (payload.new?.status === 'pending') {
          setTickets(prev => [payload.new, ...prev]);
          alert(`🆕 Nouveau ticket: ${payload.new.client_name}`);
        }
      } 
      else if (payload.eventType === 'UPDATE') {
        // If ticket is now completed, remove it
        if (payload.new.status === 'completed') {
          setTickets(prev => prev.filter(t => t.id !== payload.new.id));
        } 
        // If ticket is pending OR assigned, update it (keep it visible)
        else if (payload.new.status === 'pending' || payload.new.status === 'assigned') {
          setTickets(prev => 
            prev.map(t => t.id === payload.new.id ? payload.new : t)
          );
        }
      }
    }
  )
  .subscribe();
  
  // Cleanup
  return () => {
    clearInterval(intervalId);
    supabase.removeChannel(ticketsChannel);
  };
}, []);
  const marquerCompleter = async (idTicket) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: 'completed' })
        .eq('id', idTicket);
      
      if (error) throw error;
      
      setTickets(prev => prev.filter(t => t.id !== idTicket));
      alert('✅ Ticket marqué comme terminé');
      
    } catch (erreur) {
      console.error('Erreur:', erreur);
      alert('Échec: ' + erreur.message);
    }
  };

  // FIXED: Comment/Message Function
  const sendMessageToClient = async (ticketId, message) => {
    if (!message.trim()) {
      alert('Veuillez écrire un message');
      return;
    }

    try {
      // Add to ticket_messages table
      const { error: messageError } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          sender_role: 'manager',
          message: message.trim()
        });
      
      if (messageError) throw messageError;
      
      // Update ticket status_reason
      const { error: ticketError } = await supabase
        .from('tickets')
        .update({ 
          status_reason: message.trim(),
          status: 'assigned' // Optional: change status to assigned
        })
        .eq('id', ticketId);
      
      if (ticketError) throw ticketError;
      
      // Update local state
      setTickets(prev =>
        prev.map(t => 
          t.id === ticketId 
            ? { ...t, status_reason: message.trim(), status: 'assigned' }
            : t
        )
      );
      
      alert(' Message envoyé au client!');
      setMessageModal({ open: false, ticketId: null, message: '' });
      
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Erreur d\'envoi: ' + error.message);
    }
  };

  const ajouterMateriel = async () => {
    if (!nouveauMateriel.trim()) {
      alert('Entrez un nom de matériel');
      return;
    }

    try {
      const { error } = await supabase
        .from('ticket_materials')
        .insert({
          material_name: nouveauMateriel,
          quantity: quantite
        });
      
      if (error) throw error;
      
      // Refresh materials list
      const { data: nouvellesDonnees } = await supabase
        .from('ticket_materials')
        .select('id, material_name, quantity, requested_at, fulfilled')
        .order('requested_at', { ascending: false })
        .limit(10);
      
      setMateriaux(nouvellesDonnees || []);
      setNouveauMateriel('');
      setQuantite(1);
      
      alert(` ${quantite} ${nouveauMateriel} ajouté(s) !`);
      
    } catch (erreur) {
      console.error('Erreur:', erreur);
      alert('Échec d\'ajout de matériel: ' + erreur.message);
    }
  };

const MessageModal = () => {
  // Use ref instead of state for the textarea value
  const textareaRef = useRef(null);
  
  // Initialize ref with current message
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.value = messageModal.message || '';
    }
  }, [messageModal.open]); 

  const handleSend = () => {
    const message = textareaRef.current?.value || '';
    if (message.trim()) {
      sendMessageToClient(messageModal.ticketId, message);
    } else {
      alert('Veuillez écrire un message');
      textareaRef.current?.focus();
    }
  };

  return (
    <div className="modal-overlay" style={{
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
      <div className="modal-content" style={{
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        width: '400px',
        maxWidth: '90%'
      }}>
        <h3>Envoyer un message au client</h3>
        <textarea
          ref={textareaRef}
          defaultValue={messageModal.message} 
          placeholder="Ex: 'Pièce manquante, arrivée demain'"
          rows="4"
          style={{ 
            width: '100%', 
            padding: '10px', 
            marginBottom: '15px',
            border: '1px solid #ddd',
            fontSize: '16px'
          }}
          onKeyDown={(e) => {
            
            if (e.ctrlKey && e.key === 'Enter') {
              handleSend();
            }
            // Escape to close
            if (e.key === 'Escape') {
              setMessageModal({ open: false, ticketId: null, message: '' });
            }
          }}
        />
        <div className="modal-buttons" style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleSend}
            style={{ 
              flex: 1, 
              padding: '10px', 
              background: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Envoyer
          </button>
          <button
            onClick={() => setMessageModal({ open: false, ticketId: null, message: '' })}
            style={{ 
              flex: 1, 
              padding: '10px', 
              background: '#6c757d', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};
  if (chargement) return <div>Chargement des tickets...</div>;

  return (
    <div className="manager-dashboard-container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Tableau de Bord Manager</h1>
      

      {messageModal.open && <MessageModal />}

  
<div style={{ marginBottom: '40px' }}>
  <h2>Tickets en Attente ({tickets.length})</h2>
  
  {tickets.length === 0 ? (
    <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
      Aucun ticket en attente
    </p>
  ) : (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}> 
      <table style={{ 
        width: '100%', 
        borderCollapse: 'collapse',
        border: '1px solid #ddd',
        minWidth: '800px'  
      }}>
        <thead>
          <tr style={{ background: '#f2f2f2' }}>
            <th style={{ padding: '12px', textAlign: 'left', whiteSpace: 'nowrap' }}>Client</th>
            <th style={{ padding: '12px', textAlign: 'left', whiteSpace: 'nowrap' }}>Problème</th>
            <th style={{ padding: '12px', textAlign: 'left', whiteSpace: 'nowrap' }}>Soumis le</th>
            <th style={{ padding: '12px', textAlign: 'left', whiteSpace: 'nowrap' }}>Photo</th>
            <th style={{ padding: '12px', textAlign: 'left', whiteSpace: 'nowrap' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map(ticket => (
            <tr key={ticket.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '12px', minWidth: '150px' }}><strong>{ticket.client_name}</strong></td>
              <td style={{ padding: '12px', minWidth: '250px' }}>
                {ticket.issue_description}
                {ticket.status_reason && (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '5px', fontStyle: 'italic' }}>
                    💬 {ticket.status_reason}
                  </div>
                )}
              </td>
              <td style={{ padding: '12px', fontSize: '14px', color: '#666', minWidth: '100px' }}>
                {new Date(ticket.submitted_at).toLocaleDateString('fr-FR')}
              </td>
              <td style={{ padding: '12px', minWidth: '100px' }}>
                {ticket.photo_url ? (
                  <img 
                    src={ticket.photo_url} 
                    alt="Problème" 
                    className="photo-thumbnail"
                    style={{ width: '80px', borderRadius: '4px' }}
                  />
                ) : 'Aucune photo'}
              </td>
              <td style={{ padding: '12px', minWidth: '200px' }}>
                <div className="button-group" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      if (window.confirm('Marquer ce ticket comme terminé ?')) {
                        marquerCompleter(ticket.id);
                      }
                    }}
                    style={{
                      padding: '6px 12px',
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    type="button"
                  >
                    Terminé
                  </button>
                  <button
                    onClick={() => setMessageModal({ 
                      open: true, 
                      ticketId: ticket.id, 
                      message: ticket.status_reason || '' 
                    })}
                    style={{
                      padding: '6px 12px',
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    type="button"
                  >
                    Message
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</div>

    
      <div className="materials-section" style={{ 
        background: '#f9f9f9', 
        padding: '20px', 
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <h2>Ajouter Matériels Manquants</h2>
        
        <div className="materials-input-row" style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'flex-end' }}>
          <div style={{ flex: 3 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
              Matériel:
            </label>
            <input
              type="text"
              value={nouveauMateriel}
              onChange={(e) => setNouveauMateriel(e.target.value)}
              placeholder="ex: Ampoules, interrupteurs, câbles"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
              Qté:
            </label>
            <input
              type="number"
              min="1"
              max="999"
              value={quantite}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setQuantite(isNaN(value) || value < 1 ? 1 : value);
              }}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>
          
          <button
            onClick={ajouterMateriel}
            disabled={!nouveauMateriel.trim()}
            style={{
              padding: '10px 20px',
              background: !nouveauMateriel.trim() ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: !nouveauMateriel.trim() ? 'not-allowed' : 'pointer',
              height: 'fit-content'
            }}
            type="button"
          >
            Ajouter
          </button>
        </div>
        
        {materiaux.length > 0 && (
          <div>
            <h3>Matériels Récemment Ajoutés</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#e9ecef' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Matériel</th>
                
                  <th style={{ padding: '8px', textAlign: 'left' }}>Quantité</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {materiaux.map(mat => (
                  <tr key={mat.id}>
                    <td style={{ padding: '8px' }}>{mat.material_name}</td>
                    <td style={{ padding: '8px' }}>{mat.quantity}</td>
                    <td style={{ padding: '8px' }}>
                      {new Date(mat.requested_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td style={{ padding: '8px' }}>
                      <span className="status-badge" style={{ 
                        color: mat.fulfilled ? '#28a745' : '#dc3545',
                        fontWeight: 'bold'
                      }}>
                        {mat.fulfilled ? '✅ Fourni' : '⏳ En attente'}
                      </span>
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

export default ManagerDashboard;