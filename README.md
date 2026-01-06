# Complete Enterprise Maintenance & Task Management System

## Project Overview
A comprehensive enterprise system for maintenance management, employee task tracking, inventory control, and damage reporting across 7 employee lots.

## Core Modules

### 1. Authentication & Role Management
- **5 User Roles**: Admin, Inventory Manager, Employee Manager, Client, + 7 Employee Lots
- **Secure Login**: Role-based access control
- **Password Management**: Admin can reset all passwords

### 2. Employee Portal (7 Lots)
- **Daily Task Management**: Select date → View day's tasks
- **Time Tracking**: Record start/end times for each task
- **Task Completion**: Checkmark system with remarks
- **Damage Reports**: Separate incident reporting with photos
- **damage report Archiving**: Carry over incomplete damage reports to next day

### 3. Client Portal
- **Maintenance Requests**: Submit tickets with descriptions/photos
- **Ticket Tracking**: View status updates from managers


### 4. Manager Dashboard
- **Ticket Management**: View/assign client requests
- **Communication**: Add remarks/updates to tickets
- **Completion Tracking**: Mark tickets as done
- **Material Requests**: Log required materials for jobs

### 5. Inventory Manager
- **Stock Management**: Add/update inventory items

### 6. Admin Super Dashboard
- **Complete Oversight**: View all modules in one interface
- **Advanced Reporting**: Filter by date/date range
- **PDF Export**: Generate reports of tasks/damage reports
- **User Management**: Reset passwords, manage all accounts
- **Data Analytics**: View submission trends and completion rates

## Key Features
- **Date-Based Task Loading**: Employees see different tasks each day
- **Time Tracking**: Precise start/end recording for accountability
- **Damage Reporting**: Separate from regular maintenance
- **Archive System**: Incomplete tasks carry forward automatically
- **Material Request Workflow**: Client → Manager → Inventory → Employee
- **PDF Reporting**: Export any date range to formatted PDF
- **Mobile Responsive**: Field workers can use on phones/tablets

## User Types & Credentials

| Role | Username | Password | Department | Access |
|------|----------|----------|------------|--------|
| **Admin** | admin | zealord | System | Full system control, PDF export, password management |
| **Inventory Manager** | inventory | feds | Inventory | Stock management, material fulfillment |
| **Employee Manager** | manager | feds | Management | Employee oversight, task assignment |
| **Client** | client_test | test123 | External | Ticket submission and tracking |
| **Electricity Employee** | elec | feds | ELECTRICITE | Daily electrical tasks + damage reports |
| **Climatisation Employee** | clim | feds | CLIMATISATION | HVAC tasks + damage reports |
| **Plumbing Employee** | plomb | feds | PLOMBERIE | Plumbing tasks + damage reports |
| **Ventilation Employee** | ventil | feds | VENTILATION | Ventilation tasks + damage reports |
| **Carpentry Employee** | menuise | feds | MENUISERIE | Carpentry tasks + damage reports |
| **Painting Employee** | peint | feds | PEINTURE | Painting tasks + damage reports |
| **VRD Employee** | vrd | feds | VRD | External works tasks + damage reports |
| **SSI Employee** | ssi | feds | SSI | Security systems tasks + damage reports |

## Workflow Examples

### Employee Daily Workflow:
1. Login → Select date → View assigned tasks
2. For each task: Record start time → Do work → Record end time → Add remarks → Mark complete
3. Submit damage reports if needed (with photos)
4. Archive unfinished damage report for tomorrow and submits when done

### Client → Manager → Inventory Flow:
1. Client submits maintenance ticket
2. Manager sees ticket and sends employee to complete work
3. Manager marks ticket done

### Admin Reporting:
1. Select date range (e.g., Jan 1-31)
2. View all employee tasks + completion rates
3. View all damage reports
4. Export to PDF for management review

## Technology Stack
- **Frontend**: React 18 + Vite
- **Database**: Supabase (PostgreSQL + Realtime)
- **Authentication**: bcrypt + Role-based
- **PDF Generation**: jsPDF + html2canvas
- **UI Library**: Custom CSS 
- **Hosting**: Netlify
- **File Storage**: Supabase Storage for photos

## Live Demo(hosting)
https://imaginative-conkies-07e239.netlify.app

## Project Significance
This system replaces: paper timesheets, Excel task lists, email-based reporting, manual inventory tracking, and physical maintenance request forms with a unified digital platform.