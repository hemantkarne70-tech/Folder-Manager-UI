<div align="center">

# 📁 FolderSpace

### A clean, modern, self-hosted file and folder manager

Organize files, manage nested folders, preview documents, track recent activity, save favorites, and keep deleted files recoverable — all through a polished web interface.

[![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Django](https://img.shields.io/badge/Backend-Django-092E20?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![Python](https://img.shields.io/badge/Python-3.x-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-Choose_a_license-blue.svg)](#license)

**Ready-to-use project structure • Self-hosted storage • Customizable UI**

</div>

---

## ✨ Overview

**FolderSpace** is a starter-ready folder management application for developers and teams who want a practical, extensible foundation for managing files on their own server. It combines a Django REST API with a React interface and stores uploaded files in the configured server filesystem.

Use it as a ready structure for your own folder manager, or extend it with collaboration, cloud storage, quotas, and other workflows.

## 🚀 Features

### 📂 Files and folders
- Create and organize folders, including nested folder hierarchies.
- Navigate folders with breadcrumbs and a recursive folder tree.
- Upload files and manage them within the selected folder.
- Move files between folders.
- Search and browse stored content through the web UI.

### 👀 File preview and actions
- Preview supported file types directly from the interface.
- Download files when needed.
- Manage file and folder contents using the available actions.
- Bulk upload support.

### 🕘 Recent activity
- A dedicated **Recent** section for latest file activity.
- Show recent files with useful details such as file name, folder path, size, and activity time where available.

### ⭐ Favorites
- Mark files as favorites for quick access.
- Open the Favorites section to find saved items.

### 🗑️ Trash and recovery
- Move deleted files to Trash instead of deleting them immediately.
- Restore files when they are needed again.
- Permanently delete individual items or empty Trash.
- Configure scheduled cleanup to permanently remove trashed files after the retention period.

> **Cleanup note:** Automatic 30-day deletion requires the Django cleanup management command to be scheduled on the host (for example, with Windows Task Scheduler or cron). Running the command manually works without a scheduler, but does not make it run automatically.

### 🎨 Personalization and usability
- Light and dark theme options.
- Font-size controls.
- Compact layout option.
- Grid/list view preferences and other browser-saved UI preferences where enabled.
- Storage usage summary with a configurable sample capacity.

### 🧩 Ready for extension
- Dedicated frontend and backend.
- Django REST endpoints that can be extended.
- A **Shared with me** section reserved for future sharing workflows.
- A starting point for adding access permissions, notifications, and configurable storage quotas.

> **Sharing status:** The Shared with me section is a future-facing placeholder unless you have separately implemented sharing APIs and permission handling. Network/IP or path visibility alone should not be treated as secure file sharing.

---

## 🖼️ Screenshots

Add screenshots of your running app here to make the GitHub page more engaging. For example:

```text
docs/
└── screenshots/
    ├── dashboard.png
    ├── nested-folders.png
    ├── file-preview.png
    ├── trash.png
    └── settings.png
```

After committing a screenshot, display it with Markdown:

```markdown
![FolderSpace dashboard](docs/screenshots/dashboard.png)
```

---

## 🏗️ Technology stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| UI icons | Lucide React |
| Backend | Python, Django, Django REST Framework |
| Database | SQLite in the local development configuration, if configured |
| File storage | Local/server filesystem through Django file storage |
| API communication | REST API |

*Your actual project configuration is authoritative. Update this section if you switch databases or storage providers.*

---

## 📁 Project structure

The exact filenames may differ slightly depending on your version. This is an illustrative layout—use the actual paths in your repository.

```text
Folder_Manager_UI/
├── backend/                     # Django project (example)
│   ├── manage.py
│   ├── <django_project>/
│   │   └── settings.py
│   └── filemanager/
│       ├── models.py            # Folder and file models
│       ├── file_views.py        # File and folder API logic
│       ├── file_serializers.py  # API serialization and validation
│       └── management/
│           └── commands/
│               └── cleanup_trashed_files.py
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main application UI
│   │   ├── App.css              # Application styles and themes
│   │   └── api/
│   │       └── client.js        # API client functions
│   ├── package.json
│   └── ...
│
└── README.md
```

---

## ⚙️ Getting started

### Prerequisites

- Python 3.x compatible with your Django dependencies
- Node.js and npm
- Git

### 1. Clone the repository

Replace the URL below with your GitHub repository URL:

```bash
git clone https://github.com/hemantkarne70-tech/Folder-Manager-UI.git
cd <Folder-Manager-UI>
```

### 2. Set up the Django backend

Open a terminal in the directory containing `manage.py`.

Create and activate a virtual environment:

**Windows PowerShell**

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**Windows Command Prompt**

```bat
python -m venv venv
venv\Scripts\activate
```

**Linux/macOS**

```bash
python3 -m venv venv
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

If your repository does not include `requirements.txt`, create one from the working environment and review it before committing:

```bash
pip freeze > requirements.txt
```

Apply migrations, check the project, and start Django:

```bash
python manage.py migrate
python manage.py check
python manage.py runserver
```

The backend commonly runs at `http://127.0.0.1:8000`. Confirm the API base URL in `frontend/src/api/client.js` matches your backend address.

### 3. Set up the React frontend

Open a second terminal in the `frontend` directory:

```bash
npm install
npm run dev
```

Vite commonly serves the frontend at `http://localhost:5173`. Open the URL printed in your terminal.

### 4. Configure the API URL

Check `frontend/src/api/client.js`. For local development, the API base URL may look like this:

```javascript
const API_BASE_URL = "http://127.0.0.1:8000/api";
```

Use the URL that matches your Django deployment. For production, avoid hard-coding a development address; use an environment-based configuration appropriate to your setup.

---

## 🗑️ Configure automatic Trash cleanup

FolderSpace includes a Django management command for removing trashed files that have passed the retention period.

Run it manually from the backend directory:

```bash
python manage.py cleanup_trashed_files
```

To make cleanup automatic, schedule this command to run daily on the host:

- **Windows:** Use Task Scheduler and configure it to run your virtual environment's Python executable with `manage.py cleanup_trashed_files` as the arguments.
- **Linux:** Use cron or your server's scheduler to run the command daily.

Use the correct absolute paths to your project, virtual environment, and `manage.py`. Test the command manually before scheduling it.

---

## 💾 Storage capacity

The UI may use a sample capacity (for example, **500 GiB**) to display a storage usage bar. This configured quota is not a guarantee that the server has that much physical disk space.

For production, consider connecting storage reporting to:
- A configured per-user quota or plan.
- Actual disk or storage-provider capacity.
- Server-side validation that rejects uploads when the user's quota is exceeded.
- Monitoring and alerts for low disk space.

**Important:** A frontend storage bar alone does not enforce a storage limit. Enforce quotas in the backend before accepting uploads.

---

## 🔐 Security and production checklist

Before exposing FolderSpace to the internet:

- Set a strong, unique Django `SECRET_KEY` through environment variables.
- Set `DEBUG = False` and configure `ALLOWED_HOSTS`.
- Configure HTTPS and appropriate CORS/CSRF settings.
- Confirm every file, folder, download, preview, favorite, restore, and delete endpoint checks ownership and permissions.
- Do not rely on URL obscurity, folder names, IP addresses, or shared paths for access control.
- Validate uploads and restrict file size and allowed file types according to your needs.
- Keep uploaded files outside public static directories unless public access is intended.
- Use a production database and backups for important data.
- Back up both the database and uploaded files.
- Configure and test Trash cleanup carefully.
- Review Django's deployment checklist: https://docs.djangoproject.com/en/stable/howto/deployment/checklist/

---

## 🛠️ Customization ideas

FolderSpace is designed to be a starting point. Useful next steps include:

- User invitations and secure file/folder sharing.
- Permission levels such as viewer, editor, and owner.
- Configurable quotas and upload limits.
- Cloud storage integration (such as S3-compatible storage).
- Activity history and audit logs.
- File version history.
- Search filters by type, size, owner, and date.
- Automated tests and CI checks.
- Docker-based development and deployment.

---

## 🤝 Contributing

Contributions, suggestions, bug reports, and improvements are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes and test them locally.
4. Open a pull request describing the change.

For bugs or feature ideas, open a GitHub issue with steps to reproduce the behavior and relevant screenshots or logs. Do not include passwords, access tokens, private files, or other sensitive information.

---

## 📄 License

Choose a license before inviting others to reuse or redistribute this project. The MIT License is one common option for open-source starter projects, but select the license that matches your intentions and add the corresponding `LICENSE` file.

Until a license is added, do not assume that the repository grants permission to reuse or redistribute the code.

---

<div align="center">

### ⭐ Like this project?

If FolderSpace helps you get started with your own file manager, consider starring the repository and sharing suggestions for improvements.

**Built as a practical foundation for your next file-management project.**

## 👨‍💻 Author

**Hemant Karne**

Software Engineer | Python | Django | REST APIs | JavaScript | CSS | HTML

GitHub: [@hemantkarne70-tech](https://github.com/hemantkarne70-tech)

</div>
