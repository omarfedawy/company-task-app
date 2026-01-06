import React from 'react';
import { Link } from 'react-router-dom';
import Admin from './admin';

function AdminDamageReports({ user }) {
  return (
    <div className="admin-damage-reports">
      <div className="page-header">
        <h1>🚨 Rapports de Dégâts (Admin)</h1>
        <Link to="/" className="nav-button">← Retour</Link>
      </div>
      
      
      <Admin 
        user={user}
        initialView="damage"  
      />
    </div>
  );
}

export default AdminDamageReports;