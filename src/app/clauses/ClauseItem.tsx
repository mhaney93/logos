"use client";

import { useState, useTransition } from "react";
import { deleteClause, updateClause } from "@/lib/actions/clauses";
import { clearActionPassword, getActionPassword } from "@/lib/clientPassword";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";
import { flattenCategoryTree } from "@/lib/categoryTree";

export function ClauseItem({
  id,
  text,
  authorUsername,
  layerId,
  layerName,
  categoryId,
  categoryName,
  layers,
  categories,
  onSelect,
}: {
  id: string;
  text: string;
  authorUsername: string;
  layerId: string;
  layerName: string;
  categoryId: string;
  categoryName: string;
  layers: { id: string; name: string; depth: number }[];
  categories: { id: string; name: string; parentId: string | null }[];
  onSelect: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(text);
  const [selectedLayerId, setSelectedLayerId] = useState(layerId);
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryId);
  const categoryTree = flattenCategoryTree(categories);
  const [isPending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function runDelete() {
    setConfirmingDelete(false);
    const password = getActionPassword();
    if (password === null) return;
    startTransition(async () => {
      try {
        await deleteClause(id, password);
      } catch (err) {
        if (err instanceof Error && err.message === "Incorrect password") {
          clearActionPassword();
        }
        alert(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  if (isEditing) {
    return (
      <li className="rounded-lg border border-black/[.08] px-4 py-3 dark:border-white/[.145]">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const password = getActionPassword();
            if (password === null) return;
            startTransition(async () => {
              try {
                await updateClause(id, value, selectedLayerId, selectedCategoryId, password);
                setIsEditing(false);
              } catch (err) {
                if (err instanceof Error && err.message === "Incorrect password") {
                  clearActionPassword();
                }
                alert(err instanceof Error ? err.message : "Failed to save");
              }
            });
          }}
        >
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1 rounded-full border border-black/[.08] px-4 py-1.5 text-sm dark:border-white/[.145]"
            autoFocus
            required
          />
          <select
            value={selectedLayerId}
            onChange={(e) => setSelectedLayerId(e.target.value)}
            className="rounded-full border border-black/[.08] px-3 py-1.5 text-sm dark:border-white/[.145] dark:bg-black"
            required
          >
            {layers.map((layer) => (
              <option key={layer.id} value={layer.id}>
                {layer.name}
              </option>
            ))}
          </select>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="rounded-full border border-black/[.08] px-3 py-1.5 text-sm dark:border-white/[.145] dark:bg-black"
            required
          >
            {categoryTree.map((category) => (
              <option key={category.id} value={category.id}>
                {"—".repeat(category.depth)} {category.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-40 dark:hover:bg-[#ccc]"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setValue(text);
              setSelectedLayerId(layerId);
              setSelectedCategoryId(categoryId);
              setIsEditing(false);
            }}
            className="rounded-full px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/[.04] dark:hover:bg-white/[.08]"
          >
            Cancel
          </button>
        </form>
      </li>
    );
  }

  return (
    <li
      onClick={onSelect}
      className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-black/[.08] px-4 py-3 hover:border-black/[.16] dark:border-white/[.145] dark:hover:border-white/[.25]"
    >
      <div>
        <p>{text}</p>
        <p className="mt-1 text-xs text-zinc-500">
          {authorUsername} · {layerName} · {categoryName}
        </p>
      </div>
      <div className="flex shrink-0 gap-3 text-xs font-medium">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Edit
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setConfirmingDelete(true);
          }}
          disabled={isPending}
          className="text-red-600 hover:text-red-800 disabled:opacity-40 dark:text-red-400 dark:hover:text-red-300"
        >
          Delete
        </button>
      </div>
      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this clause?"
        onConfirm={runDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </li>
  );
}
