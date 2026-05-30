# Collection Feature Updates

## New Features Added

### 1. Image Upload for Specimens
- **Frontend**: File upload with drag-and-drop interface
- **Backend**: Multer middleware for handling multipart form data
- Images stored in `biocella-api/uploads/specimens/`
- Automatic file cleanup on errors or deletions
- Supported formats: JPEG, JPG, PNG, GIF, WebP (max 5MB)

### 2. Automatic QR Code Generation
- QR codes automatically generated when specimens are created
- Uses same QR generation algorithm as appointments
- Each QR code contains unique token and links to public specimen view
- QR codes stored as data URLs in the database

### 3. Public Specimen View Page
- Public-facing page accessible via QR code scan
- URL: `/specimen/[id]?token=[token]`
- Displays all specimen information
- Printable format for physical records
- No authentication required for viewing

### 4. Role-Based Editing
- Only Admin and Research Assistants (RA) can edit specimens
- Edit button appears on public view only for authorized users
- Role checking based on `userRole` from localStorage/auth context

## Backend Changes

### New Files:
1. **config/upload.js** - Multer configuration for file uploads
   - Storage configuration
   - File type validation
   - Size limits

### Modified Files:
1. **controllers/microbialController.js**
   - Added image upload handling
   - QR code generation on create
   - Image cleanup on update/delete
   - FormData parsing support

2. **routes/microbialRoutes.js**
   - Added multer middleware to POST and PUT routes
   - Handles multipart/form-data

3. **app.js**
   - Added static file serving for `/uploads` directory
   - Images accessible at `http://your-api-url/uploads/specimens/filename.jpg`

### Dependencies Added:
- `multer` - File upload handling

## Frontend Changes

### New Files:
1. **app/specimen/[id]/page.tsx** - Public specimen view
   - QR code display
   - Printable layout
   - Role-based edit access

### Modified Files:
1. **AdminCollection/SpecimenModal.tsx**
   - Replaced URL input with file upload
   - Added image preview
   - FormData submission instead of JSON
   - Removed QR code input (auto-generated)

2. **AdminCollection/page.tsx**
   - Updated handleSaveSpecimen to send FormData
   - Removed Content-Type header for multipart requests

3. **AdminCollection/specimen/[id]/page.tsx**
   - Display QR code image
   - Updated image source to use API_URL

## Environment Variables

### Backend (.env)
```
FRONTEND_URL=https://your-frontend-url.com
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

## Usage

### Adding a Specimen with Image:
1. Click "New Specimen" button
2. Fill in required fields
3. Upload image by clicking or dragging file
4. Preview appears automatically
5. Submit form
6. QR code is automatically generated
7. Success message confirms QR generation

### Viewing via QR Code:
1. Scan QR code with phone/scanner
2. Opens public specimen view page
3. Shows all specimen information
4. Can print for physical records
5. Edit button appears if user is Admin/RA

### Editing Specimens:
- **Admin Panel**: Click edit icon in table
- **Public View**: Click "Edit" button (Admin/RA only)
- Can upload new image to replace existing
- Old image automatically deleted

### Role Configuration:
Set user role in localStorage:
```javascript
localStorage.setItem('userRole', 'admin'); // or 'RA' or 'ra'
```

Or integrate with your auth system to set role automatically.

## API Endpoints

### POST /microbials
- **Body**: multipart/form-data
- **Fields**:
  - `image` (file) - Specimen image
  - `project_id` (string)
  - `code_name` (string)
  - `accession_number` (string)
  - `description` (string)
  - `custom_fields` (JSON string)
- **Response**: Created specimen with QR code

### PUT /microbials/:id
- **Body**: multipart/form-data (same as POST)
- **Response**: Updated specimen

### GET /uploads/specimens/:filename
- **Response**: Image file
- Served as static file

## File Structure

```
biocella-api/
├── config/
│   └── upload.js (NEW)
├── controllers/
│   └── microbialController.js (UPDATED)
├── routes/
│   └── microbialRoutes.js (UPDATED)
├── uploads/
│   └── specimens/ (NEW - auto-created)
└── app.js (UPDATED)

WebApp/
└── src/
    └── app/
        ├── specimen/
        │   └── [id]/
        │       └── page.tsx (NEW)
        └── AdminUI/
            └── AdminDashBoard/
                └── Features/
                    └── AdminCollection/
                        ├── page.tsx (UPDATED)
                        ├── SpecimenModal.tsx (UPDATED)
                        └── specimen/
                            └── [id]/
                                └── page.tsx (UPDATED)
```

## Testing

1. **Test Image Upload**:
   - Create new specimen
   - Upload various image formats
   - Verify preview appears
   - Check image saved to uploads folder

2. **Test QR Generation**:
   - Create specimen
   - Verify QR code saved in database
   - Scan QR code
   - Verify redirects to correct specimen

3. **Test Role-Based Editing**:
   - Set userRole to 'admin'
   - Verify edit button appears on public view
   - Set userRole to 'user'
   - Verify edit button hidden

4. **Test Print Function**:
   - Open public specimen view
   - Click Print button
   - Verify print layout is clean

## Notes

- QR codes contain unique tokens for verification
- Images are stored with unique filenames to prevent conflicts
- Old images are automatically deleted when:
  - Specimen is updated with new image
  - Specimen is deleted
- Public view requires no authentication
- Edit access controlled by role check only

## Future Enhancements

1. Image compression before upload
2. Multiple images per specimen
3. QR code batch printing
4. Activity logging for views
5. Permission-based viewing restrictions
6. Image optimization and thumbnails
