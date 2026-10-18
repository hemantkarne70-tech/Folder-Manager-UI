
const API_BASE_URL = "http://127.0.0.1:8000/api";

export async function apiRequest(path, options = {}, token = null) {
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Token ${token}`);
  }

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const data = await response.json();
      message = data.detail || JSON.stringify(data);
    } catch {
      // Keep the default error message.
    }

    throw new Error(message);
  }

  if (response.status === 204) return null;

  return response.json();
}

export async function login(username, password) {
  const data = await apiRequest("/token/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  return data.token;
}

export function getFolders(token, parentId = null) {
  const query =
    parentId === null
      ? "?parent=null"
      : `?parent=${encodeURIComponent(parentId)}`;

  return apiRequest(`/folders/${query}`, {}, token);
}

export function createFolder(token, name, parentId = null) {
  return apiRequest(
    "/folders/",
    {
      method: "POST",
      body: JSON.stringify({ name, parent: parentId }),
    },
    token
  );
}

export function renameFolder(token, folderId, name) {
  return apiRequest(
    `/folders/${folderId}/`,
    {
      method: "PATCH",
      body: JSON.stringify({ name }),
    },
    token
  );
}

export function deleteFolder(token, folderId) {
  return apiRequest(`/folders/${folderId}/`, {
    method: "DELETE",
  }, token);
}

export function moveFileApi(token, fileId, folderId) {
  return apiRequest(
    `/files/${fileId}/move/`,
    {
      method: "PATCH",
      body: JSON.stringify({ folder: folderId }),
    },
    token
  );
}

export function getFiles(token, folderId = null, trashed = false, all = false) {
  const query = trashed
    ? "?trashed=true"
    : all
      ? "?all=true"
      : folderId === null
        ? "?folder=null"
        : `?folder=${encodeURIComponent(folderId)}`;

  return apiRequest(`/files/${query}`, {}, token);
}

export function uploadFile(token, file, folderId, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", `${API_BASE_URL}/files/`);
    xhr.setRequestHeader("Authorization", `Token ${token}`);

    xhr.upload.onprogress = event => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let data = {};

      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // Handle non-JSON server responses below.
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        reject(
          new Error(
            data.detail ||
              data.file?.[0] ||
              `Upload failed (${xhr.status})`
          )
        );
      }
    };

    xhr.onerror = () =>
      reject(new Error("Network error during upload."));
    xhr.onabort = () =>
      reject(new Error("Upload cancelled."));

    const formData = new FormData();
    formData.append("file", file);

    if (folderId !== null) {
      formData.append("folder", String(folderId));
    }

    // Let the browser set the multipart Content-Type boundary.
    xhr.send(formData);
  });
}

export function downloadFile(token, fileId) {
  return fetch(`${API_BASE_URL}/files/${fileId}/download/`, {
    headers: { Authorization: `Token ${token}` },
  }).then(async response => {
    if (!response.ok) {
      throw new Error(`Download failed (${response.status})`);
    }

    return response.blob();
  });
}

export function deleteFileApi(token, fileId) {
  return apiRequest(
    `/files/${fileId}/`,
    { method: "DELETE" },
    token
  );
}

export function restoreFileApi(token, fileId) {
  return apiRequest(`/files/${fileId}/restore/`, { method: "POST" }, token);
}

export function permanentlyDeleteFileApi(token, fileId) {
  return apiRequest(`/files/${fileId}/permanent-delete/`, { method: "DELETE" }, token);
}

export function emptyTrashApi(token) {
  return apiRequest("/files/empty-trash/", { method: "DELETE" }, token);
}


// Returns the actual bytes currently stored for this user, including Trash.
export function getStorageSummary(token) {
  return apiRequest("/files/storage-summary/", {}, token);
}

export function setFavoriteApi(token, fileId, favorite) {
  return apiRequest(`/files/${fileId}/favorite/`, {
    method: "PATCH",
    body: JSON.stringify({ favorite }),
  }, token);
}
