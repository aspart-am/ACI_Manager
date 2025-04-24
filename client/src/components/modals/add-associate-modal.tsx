import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AssociateForm from "@/components/ui/associate-form";

interface AddAssociateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddAssociateModal({ isOpen, onClose, onSuccess }: AddAssociateModalProps) {
  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ajouter un associé</DialogTitle>
          <DialogDescription>
            Ajoutez un nouvel associé à la MSP.
          </DialogDescription>
        </DialogHeader>
        
        <AssociateForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
