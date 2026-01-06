import React, { useState } from 'react';
import { verifyPassword } from '../utils/security';
import { supabase } from './supabase';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);


  const findCompanyByUsername = (companies, username) => {
    const usernameLower = username.toLowerCase();
    
    
    const searchMap = {
      'electric': 'ELECTRICITE',
      'clim': 'CLIMATISATION',
      'plomb': 'PLOMBERIE',
      'ventil': 'VENTILATION',
      'menuise': 'MENUISERIE',
      'peint': 'PEINTURE',
      'vrd': 'VRD',
      'ssi': 'SSI'
    };
    
    const searchTerm = searchMap[usernameLower] || usernameLower.toUpperCase();
    
    return companies.find(company => 
      company.name.toUpperCase().includes(searchTerm)
    );
  };

  const handleLogin = async (e) => {
    
    e.preventDefault();
    setIsLoading(true);


    // ========== ADMIN LOGIN ==========
  
  
if (username === 'admin') {
  try {
    
    const { data: users, error } = await supabase
      .from('app_users')
      .select('password_hash, role')
      .eq('username', username)  
      .maybeSingle();  

    console.log('Admin query result:', { users, error }); 

    if (error) {
      console.error('Supabase error:', error);
      throw new Error('Database error: ' + error.message);
    }

    if (!users) {
      alert('Admin user not found in database');
      setIsLoading(false);
      return;
    }

    const isValid = await verifyPassword(password, users.password_hash);
    
    if (isValid) {
      onLogin({ 
        username: 'admin', 
        role: 'admin', 
        fullAccess: true,
        companyId: null,
        companyName: 'Administration'
      });
      setPassword('');
      setIsLoading(false);
      return;
    } else {
      alert('Wrong admin password!');
      setIsLoading(false);
      return;
    }
  } catch (error) {
    console.error('Admin login error:', error);
    alert('Admin login failed: ' + error.message);
    setIsLoading(false);
    return;
  }
}
    // ========== MANAGER LOGIN ==========
    if (username === 'manager') {
      try {
        const { data: users, error } = await supabase
          .from('app_users')
          .select('password_hash, role')
          .eq('username', 'manager')
          .single();

        if (error) throw error;

        const isValid = await verifyPassword(password, users.password_hash);
        
        if (isValid) {
          onLogin({ 
            username: 'manager', 
            role: 'manager', 
            fullAccess: false,
            companyId: null,
            companyName: 'Management'
          });
          setPassword('');
          setIsLoading(false);
          return; 
        } else {
          alert('Wrong manager password!');
          setIsLoading(false);
          return; 
        }
      } catch (error) {
        console.error('Manager login error:', error);
        alert('Manager login failed');
        setIsLoading(false);
        return; 
      }
    }
       // ========== INVENTORY WORKER LOGIN ==========
if (username === 'inventory') {
  try {
    const { data: inventoryUser, error } = await supabase
      .from('app_users')
      .select('id, password_hash, role, username')
      .eq('username', 'inventory')
      .eq('role', 'inventory_worker')
      .single();
    
    if (error) {
      console.error('Database error:', error);
      alert('Inventory account not found in database');
      setIsLoading(false);
      return;
    }
    
    if (!inventoryUser) {
      alert('Inventory account does not exist');
      setIsLoading(false);
      return;
    }
    
    // Verify password
    const isValid = await verifyPassword(password, inventoryUser.password_hash);
    
    if (isValid) {
      onLogin({
        id: inventoryUser.id, 
        username: 'inventory',
        role: 'inventory_worker',
        companyName: 'Inventory Department',
        fullAccess: false,
        companyId: null
      });
      setPassword('');
      console.log(' Inventory login successful!');
    } else {
      alert(' Wrong inventory password!');
    }
    
  } catch (error) {
    console.error('Inventory login process error:', error);
    alert('Inventory login failed: ' + error.message);
  } finally {
    setIsLoading(false);
  }
  return; 
}
// ========== CLIENT LOGIN ==========
if (username.startsWith('client_')) {
  console.log('Attempting client login for:', username);
  
  try {
  
    const { data: clientUser, error } = await supabase
      .from('app_users')
      .select('id, password_hash, role, username')
      .eq('username', username)
      .eq('role', 'client')
      .single();
    
    console.log('Database query result:', { clientUser, error });
    
    if (error) {
      console.error('Database error:', error);
      alert('Client account not found in database');
      setIsLoading(false);
      return;
    }
    
    if (!clientUser) {
      alert('Client account does not exist');
      setIsLoading(false);
      return;
    }
 
    
    // 2. Verify password
    console.log('Verifying password...');
    const isValid = await verifyPassword(password, clientUser.password_hash);
    console.log('Password valid?', isValid);
    
    if (isValid) {
      // 3. Extract company name from username
      const companyName = username.replace('client_', '')
        .replace(/_/g, ' ')
        .toUpperCase();
      
      // 4. Login with client data INCLUDING ID
      console.log('Logging in client with ID:', clientUser.id);
      onLogin({
        id: clientUser.id, 
        username: username,
        role: 'client',
        companyName: companyName,
        fullAccess: false,
        companyId: null
      });
      setPassword('');
      console.log(' Client login successful!');
    } else {
      alert(' Wrong client password!');
    }
    
  } catch (error) {
    console.error('Client login process error:', error);
    alert('Client login failed: ' + error.message);
  } finally {
    setIsLoading(false);
  }
  return; 
}
    // ========== COMPANY/EMPLOYEE LOGIN ==========
    try {
      // 1. Get all companies from database
      const { data: allCompanies, error: companiesError } = await supabase
        .from('companies')
        .select('id, name')
        .order('id');

      if (companiesError) throw companiesError;

      // 2. Find which company matches the username
      const company = findCompanyByUsername(allCompanies || [], username);

      if (!company) {
        alert(`Invalid username! Could not find company for "${username}"`);
        setIsLoading(false);
        return;
      }

      // 3. Get password hash from database
      const { data: passwordData, error: passError } = await supabase
        .from('company_passwords')
        .select('password_hash')
        .eq('company_id', company.id)
        .single();

      if (passError) {
        console.error('Password lookup error:', passError);
        alert('Login configuration error. Please contact admin.');
        setIsLoading(false);
        return;
      }

      // 4. Verify password
      const isValid = await verifyPassword(password, passwordData.password_hash);
      
      if (isValid) {
        onLogin({
          username: username,
          role: 'employee',
          companyId: company.id,
          companyName: company.name
        });
        setPassword('');
      } else {
        alert('Wrong password!');
      }
      
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h2>Login</h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Username:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="off"
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              readOnly
              onFocus={(e) => {
                e.target.removeAttribute('readonly');
              }}
              disabled={isLoading}
            />
          </div>
          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;