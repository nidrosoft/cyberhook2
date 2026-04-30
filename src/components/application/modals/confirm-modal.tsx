"use client";

/**
 * Reusable confirm dialog used by admin / destructive flows. Built on
 * the system Modal primitives (react-aria) so focus trap, escape-to-close,
 * and overlay click handling all match the rest of the app.
 *
 * Drives the entire async lifecycle for the confirming action:
 *   - while `loading` the OK button shows a spinner and Cancel is disabled
 *   - the modal stays open until the consumer flips `open` to false
 *
 * Pass `tone="destructive"` for red-styled OK button (reject / delete /
 * deactivate). Default tone is brand (approve / reactivate).
 */

import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle, XClose } from "@untitledui/icons";

import { Button } from "@/components/base/buttons/button";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";

export interface ConfirmModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    description?: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: "destructive" | "primary";
    loading?: boolean;
}

export function ConfirmModal({
    open,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    tone = "primary",
    loading = false,
}: ConfirmModalProps) {
    const isDestructive = tone === "destructive";
    const Icon = isDestructive ? AlertTriangle : CheckCircle;

    return (
        <ModalOverlay
            isOpen={open}
            onOpenChange={(o) => {
                if (!o && !loading) onClose();
            }}
            isDismissable={!loading}
        >
            <Modal>
                <Dialog>
                    {({ close }) => (
                        <div className="w-full max-w-md rounded-xl bg-primary shadow-xl ring-1 ring-secondary">
                            <div className="relative p-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!loading) {
                                            onClose();
                                            close();
                                        }
                                    }}
                                    className="absolute right-4 top-4 rounded-md p-1 text-quaternary transition hover:bg-secondary_subtle hover:text-secondary disabled:opacity-50"
                                    disabled={loading}
                                    aria-label="Close"
                                >
                                    <XClose className="h-5 w-5" />
                                </button>

                                <div
                                    className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
                                        isDestructive ? "bg-error-100" : "bg-brand-100"
                                    }`}
                                >
                                    <Icon
                                        className={`h-6 w-6 ${
                                            isDestructive ? "text-error-600" : "text-brand-600"
                                        }`}
                                    />
                                </div>

                                <h2 className="text-center text-lg font-semibold text-primary">
                                    {title}
                                </h2>
                                {description && (
                                    <div className="mt-2 text-center text-sm text-tertiary">
                                        {description}
                                    </div>
                                )}

                                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                    <Button
                                        color="secondary"
                                        onClick={() => {
                                            onClose();
                                            close();
                                        }}
                                        isDisabled={loading}
                                    >
                                        {cancelLabel}
                                    </Button>
                                    <Button
                                        color={isDestructive ? "primary-destructive" : "primary"}
                                        onClick={async () => {
                                            await onConfirm();
                                        }}
                                        isLoading={loading}
                                        isDisabled={loading}
                                    >
                                        {confirmLabel}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
