# Collection Feature Documentation

## Overview
The Collection feature is a comprehensive specimen inventory and information management system for the biology department. It uses a hybrid SQL/NoSQL approach to handle structured and unstructured data.

## Architecture

### Database Structure

#### SQL Side (MySQL)
- **User Table**: Contains user information with `user_id` as primary key

#### NoSQL Side (MongoDB)
The following collections are stored in MongoDB:

1. **Projects**
   - `_id`: MongoDB ObjectId
   - `title`: Project title
   - `code`: Project code
   - `classification`: Type of specimen (Bacteria, Fungi, etc.)
   - `user_id`: Foreign key reference to SQL User table

2. **Microbial_Info** (Specimens)
   - `_id`: MongoDB ObjectId
   - `project_id`: Reference to Projects collection
   - `code_name`: Specimen code
   - `accession_number`: Accession number
   - `qr_code`: QR code data
   - `image_url`: Image URL
   - `description`: Specimen description
   - `custom_fields`: Flexible object for additional data
     - `locale`: Location where specimen was collected
     - `source`: Source of specimen
     - `storage_type`: Storage method
     - `shelf`: Physical location
     - `funded_by`: Funding organization

3. **Related Collections** (linked to Microbial_Info via `microbial_id`)
   - **Bioactivity**: Bioactivity test data
   - **Biochemical**: Biochemical characteristics
   - **Morphology**: Morphological data
   - **Genome_Sequence**: Genome sequencing data

4. **Resource**: Additional resource information

### Connection
- SQL `user_id` → NoSQL `Project.user_id`
- NoSQL `Project._id` → NoSQL `Microbial_Info.project_id`
- NoSQL `Microbial_Info._id` → Related collections' `microbial_id`

## Frontend Features

### Admin Collection Management (`/AdminUI/AdminDashBoard/Features/AdminCollection`)

#### Main Features:
1. **View All Specimens**: Display all specimens in a table with filtering and search
2. **Add New Specimen**: Modal form to create new specimens
3. **Edit Specimen**: Update existing specimen information
4. **Delete Specimen**: Remove specimens from the system
5. **View Details**: Navigate to detailed specimen view

#### Components:
- `page.tsx`: Main page with state management and API integration
- `AdminCollection.tsx`: Table component displaying specimens
- `AdminControls.tsx`: Control panel with actions and search
- `SpecimenModal.tsx`: Modal form for creating/editing specimens
- `ProjectModal.tsx`: Modal form for creating/editing projects

### Project Management (`/AdminUI/AdminDashBoard/Features/AdminCollection/projects`)
- View all projects
- Create new projects
- Edit existing projects
- Delete projects (with warning if specimens exist)
- View specimen count per project

### Specimen Details (`/AdminUI/AdminDashBoard/Features/AdminCollection/specimen/[id]`)
- View complete specimen information
- Tabbed interface for different data types:
  - Basic Info
  - Bioactivity
  - Biochemical
  - Morphology
  - Genome
- Edit and delete actions
- QR code and image display

## Backend API Endpoints

### Projects
- `GET /projects` - Get all projects
- `GET /projects/:id` - Get project by ID
- `POST /projects` - Create new project
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project

### Microbial Info (Specimens)
- `GET /microbials` - Get all specimens (with populated project data)
- `GET /microbials/:id` - Get specimen by ID (with populated project data)
- `POST /microbials` - Create new specimen
- `PUT /microbials/:id` - Update specimen
- `DELETE /microbials/:id` - Delete specimen

### Related Collections
- `GET /bioactivity` - Get all bioactivity data
- `POST /bioactivity` - Create bioactivity data
- Similar endpoints for: biochemical, morphology, genome, resource

## Usage Guide

### Creating a New Project
1. Navigate to Collection or Projects page
2. Click "New Project" button
3. Fill in:
   - Project Title
   - Project Code
   - Classification
4. Click "Create Project"

### Adding a New Specimen
1. Navigate to Collection page
2. Click "New Specimen" button
3. Fill in required fields:
   - Select a Project
   - Code Name (required)
   - Additional optional fields
4. Click "Add Specimen"

### Searching Specimens
Use the search bar to filter by:
- Code name
- Accession number
- Project title
- Locale
- Source

### Editing Specimens
1. Click the edit icon (pencil) in the Actions column
2. Modify fields in the modal
3. Click "Update Specimen"

### Viewing Specimen Details
1. Click the view icon (eye) in the Actions column
2. View complete information in tabbed interface
3. Use tabs to view related data (Bioactivity, Biochemical, etc.)

## Data Flow

1. **User Authentication**: User logs in (SQL User table)
2. **Project Creation**: Admin creates project linked to user_id
3. **Specimen Entry**: Admin adds specimens linked to projects
4. **Related Data**: Additional data (bioactivity, morphology, etc.) linked to specimens
5. **Querying**: Frontend fetches data with populated relationships

## Future Enhancements

### Planned Features:
1. **QR Code Generation**: Auto-generate QR codes for specimens
2. **Image Upload**: Upload and manage specimen images
3. **Batch Operations**: Bulk import/export specimens
4. **Advanced Search**: Filter by multiple criteria
5. **Data Entry Forms**: Specialized forms for bioactivity, biochemical, morphology, and genome data
6. **Reports**: Generate specimen inventory reports
7. **Audit Trail**: Track changes to specimen data
8. **Export**: Export data in various formats (CSV, PDF)

## Technical Notes

### Frontend Stack:
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Lucide Icons

### Backend Stack:
- Node.js
- Express.js
- MongoDB (Mongoose)
- MySQL

### Key Design Decisions:
1. **Hybrid Database**: SQL for structured user data, NoSQL for flexible specimen data
2. **Population**: Backend populates project data to reduce frontend API calls
3. **Custom Fields**: Use of `custom_fields` object for extensibility
4. **Modular Components**: Reusable modals and components for maintainability

## Troubleshooting

### Common Issues:

1. **Projects not showing in dropdown**
   - Ensure projects are created first
   - Check API endpoint is accessible

2. **Specimen data not loading**
   - Verify MongoDB connection
   - Check API_URL in config

3. **Project data not populating**
   - Ensure microbial controller uses `.populate('project_id')`
   - Verify project_id is a valid ObjectId

## API Configuration

Update the API URL in `WebApp/src/config/api.ts`:

\`\`\`typescript
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
\`\`\`

For production, set the `NEXT_PUBLIC_API_URL` environment variable.
