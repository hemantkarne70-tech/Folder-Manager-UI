
import { useEffect, useMemo, useRef, useState } from "react";
import Login from "./Login";
import {
  apiRequest,
  createFolder as createFolderApi,
  deleteFolder as deleteFolderApi,
  renameFolder as renameFolderApi,
  getFiles,
  uploadFile,
  downloadFile,
  deleteFileApi,
  moveFileApi,
  restoreFileApi,
  permanentlyDeleteFileApi,
  emptyTrashApi,
} from "./api/client";
import {
  Folder, FolderOpen, Search, Clock3, Users, Star, Trash2,
  Plus, Upload, LayoutGrid, List, ChevronRight, MoreVertical,
  FileText, FileSpreadsheet, FileCode, FileImage, FileVideo,
  File as FileIcon, X, CloudUpload, HardDrive, Settings,
  Bell, CheckCircle2, ArrowUpDown, Menu, Download, LogOut,
  FolderInput
} from "lucide-react";
import "./App.css";

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function getFileType(name) {
  const ext = name.split(".").pop().toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "image";
  if (["xls", "xlsx", "csv"].includes(ext)) return "sheet";
  if (["py", "js", "jsx", "ts", "json", "html", "css"].includes(ext)) return "code";
  if (["mp4", "mov", "avi", "webm"].includes(ext)) return "video";
  if (["pdf"].includes(ext)) return "pdf";
  if (["doc", "docx", "txt", "md"].includes(ext)) return "doc";
  return "file";
}

function FileGlyph({ type }) {
  const icons = {
    pdf: FileText,
    doc: FileText,
    image: FileImage,
    sheet: FileSpreadsheet,
    code: FileCode,
    video: FileVideo,
    file: FileIcon,
  };
  const Icon = icons[type] || FileIcon;
  return <Icon size={34} strokeWidth={1.7} />;
}

function Sidebar({ section, setSection, folders, activeFolder, setActiveFolder, onNewFolder, username, onLogout }) {
  const items = [
    { id: "files", label: "My Files", icon: Folder },
    { id: "recent", label: "Recent", icon: Clock3 },
    { id: "shared", label: "Shared with me", icon: Users },
    { id: "favorites", label: "Favorites", icon: Star },
    { id: "trash", label: "Trash", icon: Trash2 },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon"><FolderOpen size={25} /></div>
        <span>Folder<span className="brand-light">Space</span></span>
      </div>

      <button className="primary-button new-folder" onClick={onNewFolder}>
        <Plus size={19} /> New folder
      </button>

      <nav className="side-nav">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`nav-item ${section === id ? "active" : ""}`}
            onClick={() => {
              setSection(id);
              setActiveFolder(null);
            }}
          >
            <Icon size={19} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-divider" />

      <div className="storage-heading">
        <span>Storage</span>
        <HardDrive size={17} />
      </div>
      <div className="storage-bar"><span /></div>
      <div className="storage-caption">Private server storage</div>
      <div className="storage-caption storage-used">Storage usage will be calculated</div>

      <div className="sidebar-divider" />
      <div className="tree-heading">Folders</div>
      <div className="folder-tree">
        {folders.filter(f => f.parent === null).map(folder => (
          <div key={folder.id}>
            <button
              className={`tree-item ${activeFolder === folder.id ? "selected" : ""}`}
              onClick={() => {
                setSection("files");
                setActiveFolder(folder.id);
              }}
            >
              <Folder size={17} />
              <span>{folder.name}</span>
            </button>
            {folders.filter(child => child.parent === folder.id).map(child => (
              <button
                key={child.id}
                className={`tree-item tree-child ${activeFolder === child.id ? "selected" : ""}`}
                onClick={() => {
                  setSection("files");
                  setActiveFolder(child.id);
                }}
              >
                <Folder size={16} />
                <span>{child.name}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="sidebar-bottom">
        <button className="nav-item settings-button">
          <Settings size={18} />
          <span>Settings</span>
        </button>

        <div className="profile">
          <div className="avatar">
            {(username || "U").charAt(0).toUpperCase()}
          </div>

          <div className="profile-copy">
            <strong>{username || "Your Workspace"}</strong>
            <span>Personal account</span>
          </div>
        </div>

        <button
          type="button"
          className="sidebar-logout"
          onClick={onLogout}
        >
          <LogOut size={17} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}

function App() {
  const [folders, setFolders] = useState([]);
  // Restore the login after a page reload in the same browser tab.
  const [token, setToken] = useState(() => sessionStorage.getItem("folderSpaceToken") || "");
  const [username, setUsername] = useState(() => sessionStorage.getItem("folderSpaceUsername") || "");
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  // Restore the last opened folder when the page is refreshed.
  const [activeFolder, setActiveFolder] = useState(() => {
    const savedFolder = localStorage.getItem("folderSpaceActiveFolder");
    if (savedFolder === null || savedFolder === "root") return null;
    const numericId = Number(savedFolder);
    return Number.isNaN(numericId) ? savedFolder : numericId;
  });
  const [section, setSection] = useState("files");
  const [query, setQuery] = useState("");
  const [view, setView] = useState("grid");
  const [sort, setSort] = useState("name");
  const [showSort, setShowSort] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState("");
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [openFolderMenu, setOpenFolderMenu] = useState(null);
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [moveFolderId, setMoveFolderId] = useState("");
  const [movingFile, setMovingFile] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const previewUrlRef = useRef("");
  const inputRef = useRef(null);

  const active = folders.find(f => f.id === activeFolder);

  const visibleFolders = useMemo(() => {
    let result = folders.filter(f => f.parent === activeFolder);
    if (section === "favorites") result = [];
    if (query.trim()) result = result.filter(f => f.name.toLowerCase().includes(query.toLowerCase()));
    return [...result].sort((a, b) => a.name.localeCompare(b.name));
  }, [folders, activeFolder, query, section]);

  const visibleFiles = useMemo(() => {
    let result = files.filter(f => f.folderId === activeFolder && !f.is_trashed);

    if (section === "trash") result = files.filter(f => f.is_trashed);
    else if (section === "favorites") result = files.filter(f => f.favorite && !f.is_trashed);
    else if (section === "recent") result = [...files].filter(f => !f.is_trashed).slice(-5).reverse();
    else if (section !== "files") result = [];

    if (query.trim()) result = result.filter(f => f.name.toLowerCase().includes(query.toLowerCase()));

    return [...result].sort((a, b) => {
      if (sort === "size") return b.size - a.size;
      return a.name.localeCompare(b.name);
    });
  }, [files, activeFolder, section, query, sort]);

  const breadcrumb = [];
  let current = active;
  while (current) {
    breadcrumb.unshift(current);
    current = folders.find(f => f.id === current.parent);
  }

  function notify(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  }

  async function createFolder(event) {
    event.preventDefault();

    const name = folderName.trim();
    if (!name || !token) return;

    setApiError("");

    try {
      const created = await createFolderApi(
        token,
        name,
        activeFolder
      );

      setFolders(prev => [
        ...prev,
        { ...created, color: "blue" },
      ]);

      setFolderName("");
      setShowNewFolder(false);
      notify("Folder created successfully.");
    } catch (error) {
      setApiError(error.message);
    }
  }

  async function handleRenameFolder(event) {
    event.preventDefault();

    if (!renameTarget || !renameValue.trim()) return;

    try {
      setApiError("");

      const updated = await renameFolderApi(
        token,
        renameTarget.id,
        renameValue.trim()
      );

      setFolders((previous) =>
        previous.map((folder) =>
          folder.id === renameTarget.id
            ? { ...folder, ...updated }
            : folder
        )
      );

      notify("Folder renamed successfully.");
      setRenameTarget(null);
      setRenameValue("");
    } catch (error) {
      setApiError(error.message || "Unable to rename folder.");
    }
  }

  async function handleDeleteFolder() {
    if (!folderToDelete) return;

    try {
      setApiError("");

      await deleteFolderApi(token, folderToDelete.id);

      // Remove the deleted folder and its nested folders from the UI.
      const deletedIds = new Set([folderToDelete.id]);

      let changed = true;
      while (changed) {
        changed = false;

        folders.forEach((folder) => {
          if (
            deletedIds.has(folder.parent) &&
            !deletedIds.has(folder.id)
          ) {
            deletedIds.add(folder.id);
            changed = true;
          }
        });
      }

      setFolders((previous) =>
        previous.filter((folder) => !deletedIds.has(folder.id))
      );

      if (deletedIds.has(activeFolder)) {
        setActiveFolder(null);
      }

      setFolderToDelete(null);
      notify("Folder deleted successfully.");
    } catch (error) {
      setApiError(error.message || "Unable to delete folder.");
    }
  }

  async function handlePreview(file) {
    setPreviewFile(file);
    setPreviewLoading(true);
    setPreviewError("");
    setPreviewUrl("");
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }

    try {
      const blob = await downloadFile(token, file.id);
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    } catch (error) {
      setPreviewError(error.message || "Unable to preview this file.");
    } finally {
      setPreviewLoading(false);
    }
  }

  function closePreview() {
    setPreviewFile(null);
    setPreviewError("");
    setPreviewUrl("");
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }
  }

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  async function handleDownload(file) {
    try {
      const blob = await downloadFile(token, file.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setApiError(error.message);
    }
  }

  async function handleMoveFile(event) {
    event.preventDefault();

    if (!moveTarget || movingFile) return;

    const destination =
      moveFolderId === "" ? null : Number(moveFolderId);

    try {
      setMovingFile(true);
      setApiError("");

      const updated = await moveFileApi(
        token,
        moveTarget.id,
        destination
      );

      setFiles(previous =>
        previous.map(file =>
          file.id === moveTarget.id
            ? {
                ...file,
                ...updated,
                folderId: updated.folder ?? null,
              }
            : file
        )
      );

      setMoveTarget(null);
      setMoveFolderId("");
      notify("File moved successfully.");
    } catch (error) {
      setApiError(error.message || "Unable to move file.");
    } finally {
      setMovingFile(false);
    }
  }

  async function handleFiles(fileList) {
    const incoming = Array.from(fileList || []);
    if (!incoming.length || !token) return;

    // Keep every file in the batch targeted at the folder where the upload began.
    const destinationFolder = activeFolder;
    const batchId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const results = [];

    // SQLite permits only one writer at a time. Upload sequentially to avoid
    // overlapping POST /api/files/ requests and database-lock failures.
    for (let index = 0; index < incoming.length; index += 1) {
      const file = incoming[index];
      const uploadId = `${batchId}-${index}-${file.name}`;
      setUploadProgress(prev => ({ ...prev, [uploadId]: 0 }));

      try {
        const uploaded = await uploadFile(
          token,
          file,
          destinationFolder,
          percent => {
            setUploadProgress(prev => ({
              ...prev,
              [uploadId]: percent,
            }));
          }
        );

        const normalizedFile = {
          ...uploaded,
          folderId: uploaded.folder ?? destinationFolder ?? null,
          type: getFileType(uploaded.name || file.name),
          favorite: false,
        };

        setFiles(prev => [normalizedFile, ...prev]);
        results.push({ name: file.name, success: true });
      } catch (error) {
        results.push({
          name: file.name,
          success: false,
          error: error.message || "Upload failed.",
        });
      } finally {
        setUploadProgress(prev => {
          const next = { ...prev };
          delete next[uploadId];
          return next;
        });
      }
    }

    const successful = results.filter(result => result.success);
    const failed = results.filter(result => !result.success);

    if (successful.length && !failed.length) {
      notify(
        successful.length === 1
          ? `${successful[0].name} uploaded successfully.`
          : `${successful.length} files uploaded successfully.`
      );
    } else if (successful.length && failed.length) {
      notify(`${successful.length} uploaded; ${failed.length} failed.`);
      setApiError(
        `Some files could not be uploaded: ${failed
          .map(file => `${file.name} (${file.error})`)
          .join("; ")}`
      );
    } else if (failed.length) {
      setApiError(
        `Upload failed for: ${failed
          .map(file => `${file.name} (${file.error})`)
          .join("; ")}`
      );
    }
  }

  function openFolder(folder) {
    setActiveFolder(folder.id);
    setSection("files");
    setQuery("");
  }

  async function deleteFile(id) {
    try {
      await deleteFileApi(token, id);
      setFiles(prev => prev.filter(file => file.id !== id));
      notify("File moved to Trash.");
    } catch (error) {
      setApiError(error.message);
    }
  }

  async function restoreFile(file) {
    try {
      const restored = await restoreFileApi(token, file.id);
      setFiles(prev => prev.filter(item => item.id !== file.id));
      notify(`Restored ${restored.name || file.name}.`);
    } catch (error) {
      setApiError(error.message || "Unable to restore file.");
    }
  }

  async function permanentlyDeleteFile(file) {
    if (!window.confirm(`Permanently delete ${file.name}? This cannot be undone.`)) return;
    try {
      await permanentlyDeleteFileApi(token, file.id);
      setFiles(prev => prev.filter(item => item.id !== file.id));
      notify("File permanently deleted.");
    } catch (error) {
      setApiError(error.message || "Unable to permanently delete file.");
    }
  }

  async function emptyTrash() {
    if (!window.confirm("Permanently delete every file in Trash? This cannot be undone.")) return;
    try {
      await emptyTrashApi(token);
      setFiles(prev => prev.filter(file => !file.is_trashed));
      notify("Trash emptied.");
    } catch (error) {
      setApiError(error.message || "Unable to empty Trash.");
    }
  }

  function handleLogin(authToken, loggedInUsername) {
    sessionStorage.setItem("folderSpaceToken", authToken);
    sessionStorage.setItem("folderSpaceUsername", loggedInUsername || "");
    setToken(authToken);
    setUsername(loggedInUsername || "");
    setActiveFolder(null);
  }

  function handleLogout() {
    sessionStorage.removeItem("folderSpaceToken");
    sessionStorage.removeItem("folderSpaceUsername");
    localStorage.removeItem("folderSpaceActiveFolder");
    setToken("");
    setUsername("");
    setFolders([]);
    setFiles([]);
    setApiError("");
    setActiveFolder(null);
  }

  // Keep the current folder in localStorage so a browser refresh restores it.
  useEffect(() => {
    if (activeFolder === null || activeFolder === undefined) {
      localStorage.setItem("folderSpaceActiveFolder", "root");
    } else {
      localStorage.setItem("folderSpaceActiveFolder", String(activeFolder));
    }
  }, [activeFolder]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function loadFiles() {
      try {
        const data = await getFiles(token, activeFolder, section === "trash");
        const records = Array.isArray(data) ? data : data.results;

        if (!Array.isArray(records)) {
          throw new Error("Unexpected file API response.");
        }

        if (!cancelled) {
          setFiles(
            records.map(file => ({
              ...file,
              folderId: file.folder ?? null,
              type: getFileType(file.name),
              favorite: false,
            }))
          );
        }
      } catch (error) {
        if (!cancelled) setApiError(error.message);
      }
    }

    loadFiles();

    return () => {
      cancelled = true;
    };
  }, [token, activeFolder, section]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function loadFolders() {
      setFoldersLoading(true);
      setApiError("");

      try {
        const data = await apiRequest("/folders/", {}, token);
        const records = Array.isArray(data) ? data : data.results;

        if (!Array.isArray(records)) {
          throw new Error("Unexpected folder API response.");
        }

        if (!cancelled) {
          setFolders(records.map(folder => ({
            ...folder,
            color: "blue",
          })));
        }
      } catch (error) {
        if (!cancelled) {
          setApiError(error.message);
        }
      } finally {
        if (!cancelled) {
          setFoldersLoading(false);
        }
      }
    }

    loadFolders();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">
      <div className={`sidebar-wrap ${mobileSidebar ? "mobile-open" : ""}`}>
        <Sidebar
          section={section}
          setSection={setSection}
          folders={folders}
          activeFolder={activeFolder}
          setActiveFolder={setActiveFolder}
          onNewFolder={() => setShowNewFolder(true)}
          username={username}
          onLogout={handleLogout}
        />
      </div>
      {mobileSidebar && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileSidebar(false)} />}

      <main className="main-panel">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMobileSidebar(true)}>
            <Menu size={21} />
          </button>
          <div className="search-box">
            <Search size={19} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search files and folders..."
              />
            <kbd>⌘ K</kbd>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" title="Notifications"><Bell size={20} /></button>
            <div className="top-avatar">{(username || "U").charAt(0).toUpperCase()}</div>
            <div className="user-name">{username}</div>
          </div>
        </header>

        <section className="workspace">
          {apiError && (
            <div className="api-error" role="alert">
              <span>{apiError}</span>
              <button onClick={() => setApiError("")}>Dismiss</button>
            </div>
          )}

          {foldersLoading && (
            <div className="loading-message">
              Loading your folders...
            </div>
          )}
          
          <div className="page-heading">
            <div>
              <div className="eyebrow">WORKSPACE / PERSONAL</div>
              <h1>{section === "files" ? (active?.name || "My Files") : section[0].toUpperCase() + section.slice(1)}</h1>
              <p className="page-subtitle">Keep your files organized and everything within reach.</p>
            </div>
            {section !== "trash" && <button className="primary-button heading-upload" onClick={() => inputRef.current?.click()}>
              <Upload size={18} /> Upload files
            </button>}
          </div>

          <div className="toolbar">
            <div className="breadcrumbs">
              <button onClick={() => { setActiveFolder(null); setSection("files"); }} title="My Files">
                <Folder size={17} />
              </button>
              {breadcrumb.map((folder, index) => (
                <span className="crumb" key={folder.id}>
                  <ChevronRight size={15} />
                  <button onClick={() => setActiveFolder(folder.id)} className={index === breadcrumb.length - 1 ? "crumb-current" : ""}>
                    {folder.name}
                  </button>
                </span>
              ))}
            </div>

            <div className="toolbar-actions">
              <div className="view-switch">
                <button className={view === "list" ? "chosen" : ""} onClick={() => setView("list")} aria-label="List view"><List size={18} /></button>
                <button className={view === "grid" ? "chosen" : ""} onClick={() => setView("grid")} aria-label="Grid view"><LayoutGrid size={18} /></button>
              </div>
              <div className="sort-wrap">
                <button className="secondary-button" onClick={() => setShowSort(!showSort)}>
                  <ArrowUpDown size={16} /> Sort
                </button>
                {showSort && (
                  <div className="sort-menu">
                    <button onClick={() => { setSort("name"); setShowSort(false); }}>Name (A–Z)</button>
                    <button onClick={() => { setSort("size"); setShowSort(false); }}>Largest first</button>
                  </div>
                )}
              </div>
              <button className="secondary-button new-folder-toolbar" onClick={() => setShowNewFolder(true)}>
                <Plus size={17} /> New folder
              </button>
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={e => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />

          <div
            className={`drop-zone ${dragging ? "drag-active" : ""}`}
            onDragEnter={e => {
              e.preventDefault();
              e.stopPropagation();
              setDragging(true);
            }}
            onDragOver={e => {
              e.preventDefault();
              e.stopPropagation();
              if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
            }}
            onDragLeave={e => {
              e.preventDefault();
              if (!e.currentTarget.contains(e.relatedTarget)) {
                setDragging(false);
              }
            }}
            onDrop={e => {
              e.preventDefault();
              e.stopPropagation();
              setDragging(false);

              // Use FileList first, then fall back to DataTransferItemList
              // for browsers/environments where dataTransfer.files is empty.
              const transfer = e.dataTransfer;
              let droppedFiles = Array.from(transfer?.files || []);

              if (!droppedFiles.length && transfer?.items) {
                droppedFiles = Array.from(transfer.items)
                  .filter(item => item.kind === "file")
                  .map(item => item.getAsFile())
                  .filter(Boolean);
              }

              if (droppedFiles.length) {
                handleFiles(droppedFiles);
              } else {
                setApiError("No files were detected. Drag actual files from your computer, not a folder shortcut or browser link.");
              }
            }}
          >
            <div className="drop-icon"><CloudUpload size={28} /></div>
            <div className="drop-title">{dragging ? "Drop your files here" : "Drag & drop files here"}</div>
            <div className="drop-caption">or <button type="button" onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}>browse files</button> from your computer</div>
            <div className="drop-limit">Files upload to your private server storage</div>
          </div>

          {section === "files" && (
            <div className="section-heading">
              <div><h2>Folders <span>{visibleFolders.length}</span></h2></div>
              <button className="text-button" onClick={() => setShowNewFolder(true)}><Plus size={16} /> New folder</button>
            </div>
          )}

          {section === "files" && (
            <div className="folder-grid">
              {visibleFolders.map(folder => (
                <div className="folder-card" key={folder.id}>
                  <button
                    type="button"
                    className="folder-card-main"
                    onClick={() => openFolder(folder)}
                    onDoubleClick={() => openFolder(folder)}
                  >
                    <div className={`folder-icon ${folder.color || "blue"}`}>
                      <Folder size={25} fill="currentColor" />
                    </div>

                    <div className="folder-card-copy">
                      <strong>{folder.name}</strong>
                      <span>
                        {folders.filter(f => f.parent === folder.id).length} subfolders
                      </span>
                    </div>
                  </button>

                  <div className="folder-menu-wrap">
                    <button
                      type="button"
                      className="icon-button tiny"
                      aria-label={`Actions for ${folder.name}`}
                      title="Folder actions"
                      onClick={() =>
                        setOpenFolderMenu(current =>
                          current === folder.id ? null : folder.id
                        )
                      }
                    >
                      <MoreVertical size={18} />
                    </button>

                    {openFolderMenu === folder.id && (
                      <div className="folder-action-menu">
                        <button
                          type="button"
                          onClick={() => {
                            setRenameTarget(folder);
                            setRenameValue(folder.name);
                            setOpenFolderMenu(null);
                          }}
                        >
                          <FileText size={16} />
                          Rename
                        </button>

                        <button
                          type="button"
                          className="delete-menu-item"
                          onClick={() => {
                            setFolderToDelete(folder);
                            setOpenFolderMenu(null);
                          }}
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {!visibleFolders.length && <div className="empty-inline">No folders here yet.</div>}
            </div>
          )}

          <div className="section-heading files-heading">
            <div>
              <h2>{section === "trash" ? "Trash" : section === "favorites" ? "Favorite files" : section === "recent" ? "Recent files" : "Files"} <span>{visibleFiles.length}</span></h2>
              {section === "trash" && <p className="page-subtitle">Items in Trash are permanently deleted after 30 days.</p>}
            </div>
            {section === "trash" && visibleFiles.length > 0 && <button className="secondary-button" onClick={emptyTrash}>Empty Trash</button>}
          </div>

          <div className={view === "grid" ? "file-grid" : "file-list"}>
            {visibleFiles.map(file => (
              <article className="file-card" key={file.id}>
                <div className="file-card-top">
                  <div className={`file-glyph ${file.type}`}><FileGlyph type={file.type} /></div>
                  {section === "trash" ? <>
                    <button type="button" className="icon-button tiny" title="Restore file" aria-label={`Restore ${file.name}`} onClick={() => restoreFile(file)}>
                      <FolderOpen size={17} />
                    </button>
                    <button type="button" className="icon-button tiny" title="Permanently delete" aria-label={`Permanently delete ${file.name}`} onClick={() => permanentlyDeleteFile(file)}>
                      <Trash2 size={17} />
                    </button>
                  </> : <>
                    <button className="icon-button tiny" aria-label={`Move ${file.name} to Trash`} title="Move to Trash" onClick={() => { if (window.confirm(`Move ${file.name} to Trash?`)) deleteFile(file.id); }}>
                      <Trash2 size={17} />
                    </button>
                  </>}
                  {section !== "trash" && <button
                    type="button"
                    className="icon-button tiny"
                    title="Move file"
                    aria-label={`Move ${file.name}`}
                    onClick={() => {
                      setMoveTarget(file);
                      setMoveFolderId(
                        file.folderId == null ? "" : String(file.folderId)
                      );
                    }}
                  >
                    <FolderInput size={17} />
                  </button>}
                  {section !== "trash" && <button
                    type="button"
                    className="icon-button tiny"
                    title="Preview file"
                    aria-label={`Preview ${file.name}`}
                    onClick={() => handlePreview(file)}
                  >
                    <Search size={18} />
                  </button>}
                  {section !== "trash" && <button
                    type="button"
                    className="icon-button tiny"
                    title="Download file"
                    aria-label={`Download ${file.name}`}
                    onClick={() => handleDownload(file)}
                  >
                    <Download size={18} />
                  </button>}
                </div>
                <div className="file-info">
                  <strong title={file.name}>{file.name}</strong>
                  <span>{formatSize(file.size)} <i /> {section === "trash" ? `Deleted ${file.deleted_at ? new Date(file.deleted_at).toLocaleDateString() : "recently"}` : "Stored on server"}</span>
                </div>
                <div className="file-card-bottom">
                  <button
                    className={`favorite-button ${file.favorite ? "favorited" : ""}`}
                    aria-label="Toggle favorite"
                    onClick={() => setFiles(prev => prev.map(f => f.id === file.id ? { ...f, favorite: !f.favorite } : f))}
                  ><Star size={16} fill={file.favorite ? "currentColor" : "none"} /></button>
                  <span className="file-status"><CheckCircle2 size={14} /> Available</span>
                </div>
              </article>
            ))}

            {renameTarget && (
              <div
                className="modal-backdrop"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    setRenameTarget(null);
                  }
                }}
              >
                <form className="modal" onSubmit={handleRenameFolder}>
                  <button
                    type="button"
                    className="modal-close icon-button"
                    onClick={() => setRenameTarget(null)}
                    aria-label="Close rename dialog"
                  >
                    <X size={19} />
                  </button>

                  <div className="modal-symbol">
                    <Folder size={25} />
                  </div>

                  <h2>Rename folder</h2>
                  <p>Enter a new name for this folder.</p>

                  <label htmlFor="rename-folder-name">Folder name</label>
                  <input
                    id="rename-folder-name"
                    autoFocus
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    maxLength={255}
                    required
                  />

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setRenameTarget(null)}
                    >
                      Cancel
                    </button>

                    <button
                      className="primary-button"
                      type="submit"
                      disabled={!renameValue.trim()}
                    >
                      Save changes
                    </button>
                  </div>
                </form>
              </div>
            )}

            {folderToDelete && (
              <div
                className="modal-backdrop"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    setFolderToDelete(null);
                  }
                }}
              >
                <div className="modal">
                  <button
                    type="button"
                    className="modal-close icon-button"
                    onClick={() => setFolderToDelete(null)}
                    aria-label="Close dialog"
                  >
                    <X size={19} />
                  </button>

                  <div className="modal-symbol">
                    <Trash2 size={25} />
                  </div>

                  <h2>Delete folder?</h2>

                  <p>
                    Are you sure you want to delete{" "}
                    <strong>{folderToDelete.name}</strong>?
                    This action may also remove its contents, depending on your
                    Django backend configuration.
                  </p>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setFolderToDelete(null)}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="primary-button"
                      onClick={handleDeleteFolder}
                    >
                      Delete folder
                    </button>
                  </div>
                </div>
              </div>
            )}

            {previewFile && (
              <div className="modal-backdrop preview-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) closePreview(); }}>
                <section className="preview-modal" role="dialog" aria-modal="true" aria-label={`Preview ${previewFile.name}`}>
                  <header className="preview-header">
                    <div className="preview-title-wrap">
                      <FileGlyph type={getFileType(previewFile.name)} />
                      <div><strong>{previewFile.name}</strong><span>{formatSize(previewFile.size)}</span></div>
                    </div>
                    <div className="preview-header-actions">
                      <button type="button" className="secondary-button" onClick={() => handleDownload(previewFile)}><Download size={16} /> Download</button>
                      <button type="button" className="icon-button" onClick={closePreview} aria-label="Close preview"><X size={20} /></button>
                    </div>
                  </header>
                  <div className="preview-content">
                    {previewLoading && <div className="preview-message">Loading preview…</div>}
                    {!previewLoading && previewError && <div className="preview-message preview-error">{previewError}</div>}
                    {!previewLoading && !previewError && previewUrl && (() => {
                      const type = getFileType(previewFile.name);
                      if (type === "image") return <img className="preview-image" src={previewUrl} alt={previewFile.name} />;
                      if (type === "pdf") return <iframe className="preview-frame" src={previewUrl} title={`Preview ${previewFile.name}`} />;
                      if (type === "video") return <video className="preview-media" src={previewUrl} controls />;
                      if (/\.(mp3|wav|ogg|m4a)$/i.test(previewFile.name)) return <audio className="preview-audio" src={previewUrl} controls />;
                      if (/\.(txt|md|csv|json|js|jsx|ts|css|html|py|xml|log)$/i.test(previewFile.name)) return <iframe className="preview-frame" src={previewUrl} title={`Preview ${previewFile.name}`} />;
                      return <div className="preview-message">Preview is not available for this file type. Use Download to open it on your device.</div>;
                    })()}
                  </div>
                </section>
              </div>
            )}

            {moveTarget && (
              <div
                className="modal-backdrop"
                onMouseDown={event => {
                  if (event.target === event.currentTarget && !movingFile) {
                    setMoveTarget(null);
                  }
                }}
              >
                <form className="modal" onSubmit={handleMoveFile}>
                  <button
                    type="button"
                    className="modal-close icon-button"
                    onClick={() => setMoveTarget(null)}
                    disabled={movingFile}
                    aria-label="Close dialog"
                  >
                    <X size={19} />
                  </button>

                  <div className="modal-symbol">
                    <FolderInput size={25} />
                  </div>

                  <h2>Move file</h2>
                  <p>
                    Choose where to move <strong>{moveTarget.name}</strong>.
                  </p>

                  <label htmlFor="move-destination">Destination folder</label>
                  <select
                    id="move-destination"
                    value={moveFolderId}
                    onChange={event => setMoveFolderId(event.target.value)}
                    disabled={movingFile}
                    style={{
                      width: "100%",
                      padding: "11px",
                      marginTop: "8px",
                      border: "1px solid #dbe2ea",
                      borderRadius: "8px",
                      background: "#fff",
                    }}
                  >
                    <option value="">My Files (Root)</option>

                    {folders
                      .filter(folder => folder.id !== moveTarget.folderId)
                      .map(folder => (
                        <option key={folder.id} value={String(folder.id)}>
                          {folder.name}
                        </option>
                      ))}
                  </select>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={movingFile}
                      onClick={() => setMoveTarget(null)}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="primary-button"
                      disabled={movingFile}
                    >
                      {movingFile ? "Moving..." : "Move file"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {!visibleFiles.length && (
              <div className="empty-state">
                <div className="empty-icon"><FolderOpen size={28} /></div>
                <h3>{query ? "No matching items" : section === "trash" ? "Trash is empty" : "This space is ready for you"}</h3>
                <p>{query ? "Try a different search term." : section === "trash" ? "Files you move to Trash will appear here." : "Drop files here or create a folder to get started."}</p>
                {!query && section !== "trash" && <button className="secondary-button" onClick={() => setShowNewFolder(true)}><Plus size={16} /> Create folder</button>}
              </div>
            )}
          </div>

          <div className="footer-note"><ShieldCheckIcon /> Your files are managed through your authenticated account.</div>
        </section>
      </main>

      {showNewFolder && (
        <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowNewFolder(false); }}>
          <form className="modal" onSubmit={createFolder}>
            <button type="button" className="modal-close icon-button" onClick={() => setShowNewFolder(false)}><X size={19} /></button>
            <div className="modal-symbol"><Folder size={25} /></div>
            <h2>Create new folder</h2>
            <p>Give your folder a name. You can organize it further later.</p>
            <label htmlFor="folder-name">Folder name</label>
            <input id="folder-name" autoFocus value={folderName} onChange={e => setFolderName(e.target.value)} placeholder="e.g. Project Documents" maxLength={255} />
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setShowNewFolder(false)}>Cancel</button>
              <button className="primary-button" type="submit" disabled={!folderName.trim()}>Create folder</button>
            </div>
          </form>
        </div>
      )}


      {Object.entries(uploadProgress).map(([id, percent]) => (
        <div className="progress-item" key={id}>
          <div className="progress-label">
            <span>Uploading file</span>
            <span>{percent}%</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-value"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      ))}

      {notice && <div className="toast"><CheckCircle2 size={18} /> {notice}</div>}
    </div>
  );
}

function ShieldCheckIcon() {
  return <CheckCircle2 size={15} />;
}

export default App;
