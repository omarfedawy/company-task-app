import React, { useState } from 'react';
import { supabase } from './supabase';

function InventoryWorker({ user }) {
  const [item, setItem] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const addToInventory = async () => {
    if (!item.trim()) {
      alert('Entrez un nom d\'article');
      return;
    }

    setLoading(true);
    setMessage('');
    
    try {
      const { error } = await supabase
        .from('inventory')
        .insert({
          item_name: item.trim(),
          quantity: quantity
          
        });
      
      if (error) throw error;
      
      setMessage(`✅ ${quantity} ${item} ajouté(s) à l'inventaire`);
      setItem('');
      setQuantity(1);
      
    } catch (error) {
      console.error('Error:', error);
      setMessage('❌ Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  
  if (user?.role !== 'inventory_worker') {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Accès Refusé</h2>
        <p>Cette page est réservée au responsable d'inventaire.</p>
        <p>Rôle détecté: {user?.role || 'Non connecté'}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h1> Inventaire Physique</h1>
      <p style={{ color: '#666' }}>Connecté en tant que: <strong>{user.username}</strong></p>
      <p style={{ color: '#666', marginBottom: '20px' }}>Enregistrez ce qui existe dans le stock</p>
      

      {message && (
        <div style={{
          padding: '10px',
          background: message.includes('✅') ? '#d4edda' : '#f8d7da',
          color: message.includes('✅') ? '#155724' : '#721c24',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {message}
        </div>
      )}

      {/* Add New Item Form */}
      <div style={{ 
        background: '#f9f9f9', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '30px',
        border: '1px solid #ddd'
      }}>
        <h3 style={{ marginTop: 0 }}> Nouvel Article en Stock</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Article en stock: *
          </label>
          <input
            type="text"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="ex: Ampoules 100W, Câbles 10m, Vis 5cm"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Quantité actuelle en stock: *
          </label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              setQuantity(isNaN(value) || value < 1 ? 1 : value);
            }}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px'
            }}
          />
        </div>

        <button
          onClick={addToInventory}
          disabled={!item.trim() || loading}
          style={{
            width: '100%',
            padding: '12px',
            background: !item.trim() ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: !item.trim() ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'Enregistrement...' : '➕ Enregistrer dans l\'inventaire'}
        </button>
      </div>

   
      <div style={{ 
        marginTop: '30px', 
        padding: '15px', 
        background: '#f8f9fa', 
        borderRadius: '8px',
        fontSize: '14px',
        color: '#666',
        border: '1px solid #dee2e6'
      }}>
        <h4 style={{ marginTop: 0 }}>📋 Instructions:</h4>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>Ajoutez chaque article <strong>physiquement présent</strong> dans le stock</li>
          <li>Ex: "Ampoules 100W: 50 unités", "Câbles électriques: 30 rouleaux"</li>
          <li>L'administrateur peut voir l'inventaire complet dans son tableau de bord</li>
          <li>Pour modifier ou supprimer un article, contactez l'administrateur</li>
        </ul>
      </div>
    </div>
  );
}

export default InventoryWorker;