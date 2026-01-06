import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY; 

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      'X-API-Key': 'factory-secret-key-2025'
    }
  }
});

// Company service
export const fetchCompanies = async () => {
  try {
    const { data, error } = await supabase.from('companies').select('*');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching companies:', error);
    return [
      { id: 1, name: 'LOT ELECTRICITE' },
      { id: 2, name: 'LOT CLIMATISATION' },
      { id: 3, name: 'LOT PLOMBERIE' },
      { id: 4, name: 'LOT VENTILATION' },
      { id: 5, name: 'LOT MENUISERIE' },
      { id: 6, name: 'LOT PEINTURE' },
      { id: 7, name: 'LOT VRD' },
      { id: 8, name: 'LOT SSI' }
    ];
  }
};

// Task services
export const fetchTasks = async (selectedCompany, selectedDate, getRotatingWeekNumber, getDayName) => {
  if (!selectedCompany || !selectedDate) return [];
  
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
      return existingTasks;
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
        return newTasks;
      } else {
        return [];
      }
    }
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
};

export const updateTask = async (taskId, updates) => {
  try {
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId);
    if (error) throw error;
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
};

export const toggleTaskCompletion = async (taskId, currentStatus) => {
  return updateTask(taskId, { complété: !currentStatus });
};

// Damage report services
export const fetchDamageReports = async (selectedCompany, selectedDate) => {
  if (!selectedCompany || !selectedDate) return [];
  
  try {
    const { data, error } = await supabase
      .from('signalements_degats')
      .select('*')
      .eq('id_entreprise', selectedCompany)
      .eq('report_date', selectedDate);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching damage reports:', error);
    return [];
  }
};

export const uploadImage = async (file, folder, fileName) => {
  try {
    const { data, error } = await supabase.storage
      .from('damage-reports')
      .upload(`${folder}/${fileName}`, file);
    
    if (error) throw error;
    
    const { data: urlData } = supabase.storage
      .from('damage-reports')
      .getPublicUrl(data.path);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
};

export const submitDamageReport = async (reportData) => {
  try {
    let beforePhotoUrl = null;
    let afterPhotoUrl = null;

    if (reportData.beforePhoto) {
      beforePhotoUrl = await uploadImage(
        reportData.beforePhoto, 
        'before', 
        `before-${Date.now()}.jpg`
      );
    }

    if (reportData.afterPhoto) {
      afterPhotoUrl = await uploadImage(
        reportData.afterPhoto,
        'after',
        `after-${Date.now()}.jpg`
      );
    }

    const { data, error } = await supabase
      .from('signalements_degats')
      .insert([{
        id_entreprise: reportData.companyId,
        description_degat: reportData.description,
        heure_debut: reportData.startTime,
        heure_fin: reportData.endTime,
        photo_avant_url: beforePhotoUrl,
        photo_apres_url: afterPhotoUrl,
        report_date: reportData.date
      }])
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error submitting damage report:', error);
    throw error;
  }
};

export const deleteDamageReport = async (reportId) => {
  try {
    const { error } = await supabase
      .from('signalements_degats')
      .delete()
      .eq('id', reportId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting report:', error);
    throw error;
  }
};
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  global: {
    headers: {
      'X-API-Key': 'factory-secret-key-2025'
    }
  },
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Validation service
export const validateAndResetDay = async (selectedCompany, selectedDate) => {
  try {
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
      .eq('report_date', selectedDate);

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

    return {
      success: true,
      completedTasks: currentTasks?.filter(t => t.complété).length || 0,
      totalTasks: currentTasks?.length || 0
    };
  } catch (error) {
    console.error('Error validating day:', error);
    throw error;
  }
  
};