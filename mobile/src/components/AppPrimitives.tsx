/**
 * Product-level entry point for mobile UI primitives.
 *
 * Routes should import from this module instead of reaching into generated
 * Gluestack files. Domain wrappers remain in the neighboring component
 * modules, while Gluestack stays the implementation foundation.
 */
export { Button, ButtonGroup, ButtonIcon, ButtonSpinner, ButtonText } from "./ui/button";
export { Input, InputField, InputIcon, InputSlot } from "./ui/input";
export { FormControl, FormControlError, FormControlErrorText, FormControlHelper, FormControlHelperText, FormControlLabel, FormControlLabelText } from "./ui/form-control";
export { Modal, ModalBackdrop, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader } from "./ui/modal";
export { TextInput } from "./ui/TextInput";

export { ActionButton, Card, FilterChip, InteractiveTabs, RowCard, RowCard as ListRow, SectionTitle as SectionHeader, StatusPill, Tabs, WorkflowStatusPill } from "./PimpinanPrimitives";
export { EvidenceGallery, FormSection, InlineErrorPanel, PermissionExplanation, StatusChip } from "./OperationalPrimitives";
export { BackLink, DropdownEdge, FilterBar, IconButton, MoneyText, SafeBottomAction, SearchField, SheetHeader, SheetSurface } from "./MobilePrimitives";
export { EmptyState, ErrorState, InlineError, LoadingState } from "./Screen";
export { Header as ScreenHeader } from "./Screen";

import type { ComponentType, ReactNode } from "react";
import { Text } from "react-native";
import { TextInputField } from "./NativeForm";
import { Button, ButtonText } from "./ui/button";
import { FormControl, FormControlError, FormControlErrorText, FormControlHelper, FormControlHelperText, FormControlLabel, FormControlLabelText } from "./ui/form-control";
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from "./ui/modal";
import { SheetHeader } from "./MobilePrimitives";

export type EmptyStateAction = { label: string; onPress: () => void; icon?: ComponentType<{ color?: string; size?: number; strokeWidth?: number }> };

export function FormField({ label, required = false, error, helper, children }: { label: string; required?: boolean; error?: string; helper?: string; children: ReactNode }) {
  return <FormControl isInvalid={Boolean(error)} isRequired={required} className="gap-0.5"><FormControlLabel className="mb-0.5"><FormControlLabelText className="text-xs font-extrabold text-[#0F234D]">{label}</FormControlLabelText></FormControlLabel>{children}{error ? <FormControlError className="mt-1"><FormControlErrorText className="text-xs text-[#C5312C]">{error}</FormControlErrorText></FormControlError> : helper ? <FormControlHelper className="mt-1"><FormControlHelperText className="text-xs text-[#6E7785]">{helper}</FormControlHelperText></FormControlHelper> : null}</FormControl>;
}

export function MoneyInput({ value, onChange, label, error, required = false }: { value: string | number | null | undefined; onChange: (rawValue: string) => void; label: string; error?: string; required?: boolean }) {
  return <TextInputField label={label} value={value} onChange={onChange} error={error} required={required} keyboardType="numeric" currency />;
}

export function ConfirmationDialog({ open, title, message, onClose, onConfirm, confirmLabel = "Konfirmasi", destructive = false }: { open: boolean; title: string; message: string; onClose: () => void; onConfirm: () => void | Promise<void>; confirmLabel?: string; destructive?: boolean }) {
  return <Modal isOpen={open} onClose={onClose} size="md"><ModalBackdrop /><ModalContent className="rounded-3xl border border-[#DFE4EC] bg-white p-5"><ModalHeader><SheetHeader title={title} onClose={onClose} /></ModalHeader><ModalBody><Text className="text-sm leading-5 text-[#6E7785]">{message}</Text></ModalBody><ModalFooter className="gap-2"><Button variant="outline" onPress={onClose} className="min-h-11 rounded-xl border-[#DFE4EC] bg-white"><ButtonText className="text-[#0F234D]">Batal</ButtonText></Button><Button variant={destructive ? "destructive" : "default"} onPress={onConfirm} className={destructive ? "min-h-11 rounded-xl bg-[#C5312C]" : "min-h-11 rounded-xl bg-[#1454C4]"}><ButtonText>{confirmLabel}</ButtonText></Button></ModalFooter></ModalContent></Modal>;
}
