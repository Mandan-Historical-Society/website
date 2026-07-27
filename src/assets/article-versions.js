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

  function blockType(block) {
    if (!block) {
      return "";
    }
    return block.tagName === "FIGCAPTION"
      ? "caption"
      : block.matches("h1, h2, h3, h4, h5, h6")
        ? "heading"
        : "paragraph";
  }

  function blockSimilarity(originalBlock, editedBlock) {
    if (blockType(originalBlock) !== blockType(editedBlock)) {
      return 0;
    }

    const tokenize = (block) =>
      (block?.textContent.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
    const originalTokens = tokenize(originalBlock);
    const editedTokens = tokenize(editedBlock);
    if (!originalTokens.length && !editedTokens.length) {
      return 1;
    }

    const editedCounts = new Map();
    for (const token of editedTokens) {
      editedCounts.set(token, (editedCounts.get(token) ?? 0) + 1);
    }

    let sharedTokens = 0;
    for (const token of originalTokens) {
      const count = editedCounts.get(token) ?? 0;
      if (count > 0) {
        sharedTokens += 1;
        editedCounts.set(token, count - 1);
      }
    }

    return (2 * sharedTokens) /
      (originalTokens.length + editedTokens.length);
  }

  function alignBlocks(originalBlocks, editedBlocks) {
    const gapCost = 0.55;
    const rows = originalBlocks.length + 1;
    const columns = editedBlocks.length + 1;
    const costs = Array.from({ length: rows }, () => Array(columns).fill(0));
    const moves = Array.from({ length: rows }, () => Array(columns).fill(""));

    for (let row = 1; row < rows; row += 1) {
      costs[row][0] = row * gapCost;
      moves[row][0] = "remove";
    }
    for (let column = 1; column < columns; column += 1) {
      costs[0][column] = column * gapCost;
      moves[0][column] = "add";
    }

    for (let row = 1; row < rows; row += 1) {
      for (let column = 1; column < columns; column += 1) {
        const substitution =
          costs[row - 1][column - 1] +
          1 -
          blockSimilarity(
            originalBlocks[row - 1],
            editedBlocks[column - 1],
          );
        const removal = costs[row - 1][column] + gapCost;
        const addition = costs[row][column - 1] + gapCost;
        const best = Math.min(substitution, removal, addition);

        costs[row][column] = best;
        moves[row][column] =
          best === substitution
            ? "pair"
            : best === removal
              ? "remove"
              : "add";
      }
    }

    const aligned = [];
    let row = originalBlocks.length;
    let column = editedBlocks.length;
    while (row > 0 || column > 0) {
      const move = moves[row][column];
      if (move === "pair") {
        aligned.push([
          originalBlocks[row - 1],
          editedBlocks[column - 1],
        ]);
        row -= 1;
        column -= 1;
      } else if (move === "remove") {
        aligned.push([originalBlocks[row - 1], undefined]);
        row -= 1;
      } else {
        aligned.push([undefined, editedBlocks[column - 1]]);
        column -= 1;
      }
    }

    return aligned.reverse();
  }

  function renderDiff() {
    if (diffIsRendered) {
      return;
    }

    const originalBlocks = [
      ...panels.get("original").querySelectorAll("h3, p, figcaption"),
    ];
    const editedBlocks = [
      ...panels.get("copy-edited").querySelectorAll("h3, p, figcaption"),
    ];
    const alignedBlocks = alignBlocks(originalBlocks, editedBlocks);

    for (const [originalBlock, editedBlock] of alignedBlocks) {
      const originalText = originalBlock?.textContent ?? "";
      const editedText = editedBlock?.textContent ?? "";
      const isCaption =
        originalBlock?.tagName === "FIGCAPTION" ||
        editedBlock?.tagName === "FIGCAPTION";
      const isHeading =
        originalBlock?.tagName === "H3" ||
        editedBlock?.tagName === "H3";
      const changes = window.Diff.diffWords(originalText, editedText);
      const row = document.createElement("div");
      const original = document.createElement(isHeading ? "h3" : "p");
      const edited = document.createElement(isHeading ? "h3" : "p");

      row.className = "article-diff-row";
      if (isCaption) {
        row.classList.add("article-diff-caption");
      }
      original.className = "article-diff-original";
      edited.className = "article-diff-edited";
      original.dataset.diffLabel = isCaption ? "Original caption" : "Original";
      edited.dataset.diffLabel = isCaption
        ? "Copy-edited caption"
        : "Copy-edited";

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

  if (window.location.hash) {
    window.requestAnimationFrame(() => {
      document.querySelector(window.location.hash)?.scrollIntoView({
        block: "center",
      });
    });
  }
})();
