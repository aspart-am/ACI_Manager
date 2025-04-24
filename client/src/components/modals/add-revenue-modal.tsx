import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import RevenueForm from "@/components/ui/revenue-form";

interface AddRevenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddRevenueModal({ isOpen, onClose, onSuccess }: AddRevenueModalProps) {
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
          <DialogTitle>Ajouter un revenu</DialogTitle>
          <DialogDescription>
            Ajoutez un nouveau revenu à la MSP.
          </DialogDescription>
        </DialogHeader>
        
        <RevenueForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
