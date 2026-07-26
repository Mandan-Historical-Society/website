(() => {
  const article = document.querySelector("[data-article-versions]");
  if (!article || !window.Diff) {
    return;
  }

  const validViews = new Set(["original", "copy-edited", "compare"]);
  const buttons = [...article.querySelectorAll("[data-article-view]")];
  const panels = new Map(
    [...article.querySelectorAll("[data-article-panel]")].map((panel) => [
      panel.dataset.articlePanel,
      panel,
    ]),
  );
  const diffContainer = article.querySelector("[data-article-diff]");
  let diffIsRendered = false;

  function appendChanges(target, changes, changeType) {
    for (const change of changes) {
      if (
        (changeType === "original" && change.added) ||
        (changeType === "copy-edited" && change.removed)
      ) {
        continue;
      }

      if (change.added || change.removed) {
        const mark = document.createElement(change.added ? "ins" : "del");
        mark.textContent = change.value;
        target.append(mark);
      } else {
        target.append(document.createTextNode(change.value));
      }
    }
  }

  function renderDiff() {
    if (diffIsRendered) {
      return;
    }

    const originalParagraphs = [
      ...panels.get("original").querySelectorAll("p"),
    ];
    const editedParagraphs = [
      ...panels.get("copy-edited").querySelectorAll("p"),
    ];
    const paragraphCount = Math.max(
      originalParagraphs.length,
      editedParagraphs.length,
    );

    for (let index = 0; index < paragraphCount; index += 1) {
      const originalText = originalParagraphs[index]?.textContent ?? "";
      const editedText = editedParagraphs[index]?.textContent ?? "";
      const changes = window.Diff.diffWords(originalText, editedText);
      const row = document.createElement("div");
      const original = document.createElement("p");
      const edited = document.createElement("p");

      row.className = "article-diff-row";
      original.className = "article-diff-original";
      edited.className = "article-diff-edited";
      original.dataset.diffLabel = "Original";
      edited.dataset.diffLabel = "Copy-edited";

      appendChanges(original, changes, "original");
      appendChanges(edited, changes, "copy-edited");
      row.append(original, edited);
      diffContainer.append(row);
    }

    diffIsRendered = true;
  }

  function setView(view, updateUrl = true) {
    const selectedView = validViews.has(view)
      ? view
      : article.dataset.defaultView || "original";

    if (selectedView === "compare") {
      renderDiff();
    }

    for (const [panelView, panel] of panels) {
      panel.hidden = panelView !== selectedView;
    }

    for (const button of buttons) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.articleView === selectedView),
      );
    }

    if (updateUrl) {
      const url = new URL(window.location);
      if (selectedView === article.dataset.defaultView) {
        url.searchParams.delete("view");
      } else {
        url.searchParams.set("view", selectedView);
      }
      window.history.replaceState(null, "", url);
    }
  }

  for (const button of buttons) {
    button.addEventListener("click", () => setView(button.dataset.articleView));
  }

  const requestedView = new URL(window.location).searchParams.get("view");
  setView(requestedView || article.dataset.defaultView, false);
})();
