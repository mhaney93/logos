"use client";

import { useState, useTransition } from "react";
import { deleteCategory, updateCategoryName } from "@/lib/actions/categories";
import { clearActionPassword, getActionPassword } from "@/lib/clientPassword";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";

function CategoryRow({ id, name }: { id: string; name: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [isPending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function runDelete() {
    setConfirmingDelete(false);
    const password = getActionPassword();
    if (password === null) return;
    startTransition(async () => {
      try {
        await deleteCategory(id, password);
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
      <li className="flex items-center justify-between gap-3 rounded-lg border border-black/[.08] px-4 py-3 dark:border-white/[.145]">
        <form
          className="flex flex-1 items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const password = getActionPassword();
            if (password === null) return;
            startTransition(async () => {
              try {
                await updateCategoryName(id, value, password);
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
            className="flex-1 rounded-full border border-black/[.08] px-3 py-1.5 text-sm dark:border-white/[.145]"
            autoFocus
            required
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-40 dark:hover:bg-[#ccc]"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setValue(name);
              setIsEditing(false);
            }}
            className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/[.04] dark:hover:bg-white/[.08]"
          >
            Cancel
          </button>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-black/[.08] px-4 py-3 dark:border-white/[.145]">
      <span>{name}</span>
      <div className="flex shrink-0 gap-3 text-xs font-medium">
        <button
          onClick={() => setIsEditing(true)}
          className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Edit
        </button>
        <button
          onClick={() => setConfirmingDelete(true)}
          disabled={isPending}
          className="text-red-600 hover:text-red-800 disabled:opacity-40 dark:text-red-400 dark:hover:text-red-300"
        >
          Delete
        </button>
      </div>
      <ConfirmDialog
        open={confirmingDelete}
        title={`Delete category "${name}"?`}
        onConfirm={runDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </li>
  );
}

export function CategoryList({ categories }: { categories: { id: string; name: string }[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {categories.map((category) => (
        <CategoryRow key={category.id} id={category.id} name={category.name} />
      ))}
      {categories.length === 0 && <p className="text-sm text-zinc-500">No categories yet.</p>}
    </ul>
  );
}
