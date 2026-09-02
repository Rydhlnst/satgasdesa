import { useEffect, useState } from "react";
import { Text } from "react-native";

import { type FeedbackEvent, subscribeFeedback } from "../lib/feedback";
import { Toast, ToastDescription, ToastTitle, useToast } from "./ui/toast";
import { Button, ButtonText } from "./ui/button";
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from "./ui/modal";
import { SheetHeader } from "./MobilePrimitives";

export function FeedbackHost() {
  const toast = useToast();
  const [confirmation, setConfirmation] = useState<Extract<FeedbackEvent, { kind: "confirm" }> | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeFeedback((event) => {
    if (event.kind === "confirm") {
      setConfirmation(event);
      return;
    }
    toast.show({
      placement: "top",
      duration: 3600,
      avoidKeyboard: true,
      render: ({ id }) => <Toast nativeID={`feedback-${id}`} action={event.tone} variant="solid" className="mx-4 mt-3 rounded-2xl border-0 bg-[#0F234D] px-4 py-3 shadow-lg"><ToastTitle className="text-sm font-extrabold text-white">{event.title}</ToastTitle><ToastDescription className="mt-0.5 text-xs text-[#DCE7FF]">{event.message}</ToastDescription></Toast>,
    });
    });
    return () => { unsubscribe(); };
  }, [toast]);

  function closeConfirmation() { setConfirmation(null); }
  function press(button: Extract<FeedbackEvent, { kind: "confirm" }>["buttons"][number]) {
    closeConfirmation();
    button.onPress?.();
  }

  return <Modal isOpen={Boolean(confirmation)} onClose={closeConfirmation} size="md"><ModalBackdrop /><ModalContent className="rounded-3xl border border-[#DFE4EC] bg-white p-5"><ModalHeader><SheetHeader title={confirmation?.title ?? "Konfirmasi"} onClose={closeConfirmation} closeLabel="Tutup konfirmasi" /></ModalHeader><ModalBody><Text className="text-sm leading-5 text-[#6E7785]">{confirmation?.message}</Text></ModalBody><ModalFooter className="gap-2">{confirmation?.buttons.map((button) => <Button key={button.text} variant={button.style === "destructive" ? "destructive" : "outline"} onPress={() => press(button)} className={button.style === "destructive" ? "min-h-11 rounded-xl bg-[#C5312C]" : "min-h-11 rounded-xl border-[#DFE4EC] bg-white"}><ButtonText className={button.style === "destructive" ? "text-white" : "text-[#0F234D]"}>{button.text}</ButtonText></Button>)}</ModalFooter></ModalContent></Modal>;
}
