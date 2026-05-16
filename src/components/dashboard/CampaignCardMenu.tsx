"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";

import {
  deleteCampaign,
  renameCampaign,
  type Campaign,
} from "@/lib/actions/campaigns";

type Props = {
  campaign: Campaign;
};

const inputClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function CampaignCardMenu({ campaign }: Props) {
  const [open, setOpen] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Helper used by every interactive element inside the menu / modals so
  // their clicks don't bubble up to the parent <Link> card.
  function stop(e: React.SyntheticEvent) {
    e.stopPropagation();
    e.preventDefault();
  }

  return (
    <div
      ref={menuRef}
      className="absolute right-2 top-2 z-10"
      onClick={stop}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Campaign actions"
        onClick={(e) => {
          stop(e);
          setOpen((v) => !v);
        }}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background/90 text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <MoreVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-9 w-44 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              stop(e);
              setOpen(false);
              setShowRename(true);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              stop(e);
              setOpen(false);
              setShowDelete(true);
            }}
            className="flex w-full items-center gap-2 border-t px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </button>
        </div>
      ) : null}

      {showRename ? (
        <RenameDialog
          campaign={campaign}
          onClose={() => setShowRename(false)}
        />
      ) : null}

      {showDelete ? (
        <DeleteDialog
          campaign={campaign}
          onClose={() => setShowDelete(false)}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dialogs
// ---------------------------------------------------------------------------

function Backdrop({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-sm rounded-lg border bg-card p-5 shadow-xl"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {children}
      </div>
    </div>
  );
}

function RenameDialog({
  campaign,
  onClose,
}: {
  campaign: Campaign;
  onClose: () => void;
}) {
  const [name, setName] = useState(campaign.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();

    const fd = new FormData();
    fd.set("id", campaign.id);
    fd.set("name", name);

    startTransition(async () => {
      const result = await renameCampaign({}, fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <Backdrop onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">Rename campaign</h3>
          <p className="text-xs text-muted-foreground">
            This also updates the product name used in future generations.
          </p>
        </div>

        <input
          autoFocus
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={120}
          className={inputClass}
        />

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending || name.trim().length === 0}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </form>
    </Backdrop>
  );
}

function DeleteDialog({
  campaign,
  onClose,
}: {
  campaign: Campaign;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onConfirm(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const result = await deleteCampaign(campaign.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <Backdrop onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">Delete campaign</h3>
          <p className="text-sm text-muted-foreground">
            <strong>{campaign.name}</strong> and all of its generated images,
            videos and media will be permanently deleted. This cannot be
            undone.
          </p>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground shadow hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </Backdrop>
  );
}
