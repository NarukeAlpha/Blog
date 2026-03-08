const postForm = document.querySelector("#post-form");
const bookmarkForm = document.querySelector("#bookmark-form");
const statusOutput = document.querySelector("#status-output");
const resultTitle = document.querySelector("#result-title");
const resultBody = document.querySelector("#result-body");
const resultCard = document.querySelector("#result-card");
const repoState = document.querySelector("#repo-state");
const opencodeState = document.querySelector("#opencode-state");
const postCount = document.querySelector("#post-count");
const bookmarkCount = document.querySelector("#bookmark-count");
const rootDir = document.querySelector("#root-dir");

function setStatus(message) {
  statusOutput.textContent = message;
}

function showResult(title, lines) {
  resultTitle.textContent = title;
  resultBody.replaceChildren(
    ...lines.map((line) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = line;
      return paragraph;
    })
  );
  resultCard.hidden = false;
}

function setBusy(form, busy) {
  for (const element of form.querySelectorAll("button, input, textarea")) {
    element.disabled = busy;
  }
}

function formatFileList(files) {
  const prefix = rootDir.textContent ? `${rootDir.textContent}/` : "";

  return files.map((file) => file.replace(prefix, "")).join("\n");
}

async function refreshStatus() {
  const status = await window.studio.getStatus();

  repoState.textContent = status.gitReady ? "Git ready" : "Local only";
  opencodeState.textContent = status.opencodeReady ? "Server live" : "Starts on demand";
  postCount.textContent = String(status.postCount);
  bookmarkCount.textContent = String(status.bookmarkCount);
  rootDir.textContent = status.rootDir;
}

postForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setBusy(postForm, true);
  resultCard.hidden = true;

  const postData = new FormData(postForm);
  const payload = {
    title: postData.get("title") || "",
    summary: postData.get("summary") || "",
    tags: postData.get("tags") || "",
    body: postData.get("body") || ""
  };

  try {
    setStatus("Saving post, regenerating Writerside topics, and publishing through git...");
    const result = await window.studio.publishPost(payload);

    showResult(result.pushed ? "Post published" : "Post saved locally", [
      `Title: ${result.post.title}`,
      `Topic: ${result.post.topicPath}`,
      `Files touched:\n${formatFileList(result.files)}`,
      result.pushed
        ? `Git push completed on branch ${result.git.branch}.`
        : `Git push skipped: ${result.warning}`
    ]);

    setStatus(
      result.pushed
        ? "Post published and pushed. GitHub Actions can rebuild the site now."
        : `Post saved locally, but git publish failed: ${result.warning}`
    );

    if (result.savedLocal) {
      postForm.reset();
    }

    await refreshStatus();
  } catch (error) {
    setStatus(error.message || "Post publishing failed.");
    showResult("Post publish failed", [error.message || "Unknown error"]);
  } finally {
    setBusy(postForm, false);
  }
});

bookmarkForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setBusy(bookmarkForm, true);
  resultCard.hidden = true;

  const bookmarkData = new FormData(bookmarkForm);
  const payload = {
    url: bookmarkData.get("url") || "",
    note: bookmarkData.get("note") || ""
  };

  try {
    setStatus("Checking OpenCode, researching the bookmark, saving the table, and publishing through git...");
    const result = await window.studio.publishBookmark(payload);

    showResult(result.pushed ? "Bookmark published" : "Bookmark saved locally", [
      `Title: ${result.bookmark.title}`,
      `Source: ${result.bookmark.source || "Unknown"}`,
      `Description: ${result.bookmark.description}`,
      result.bookmark.thumbnailUrl ? `Thumbnail: ${result.bookmark.thumbnailUrl}` : "Thumbnail: none returned",
      `Files touched:\n${formatFileList(result.files)}`,
      result.pushed
        ? `Git push completed on branch ${result.git.branch}.`
        : `Git push skipped: ${result.warning}`
    ]);

    setStatus(
      result.pushed
        ? "Bookmark published and pushed. GitHub Actions can rebuild the site now."
        : `Bookmark saved locally, but git publish failed: ${result.warning}`
    );

    if (result.savedLocal) {
      bookmarkForm.reset();
    }

    await refreshStatus();
  } catch (error) {
    setStatus(error.message || "Bookmark publishing failed.");
    showResult("Bookmark publish failed", [error.message || "Unknown error"]);
  } finally {
    setBusy(bookmarkForm, false);
  }
});

refreshStatus()
  .then(() => {
    setStatus("Studio ready. Create a post or send a bookmark into the reading queue.");
  })
  .catch((error) => {
    setStatus(error.message || "Studio loaded, but status could not be read.");
  });
