import { RefObject } from 'react';

interface ModalProps {
  handleClick: () => void;
  modalRef: RefObject<HTMLDialogElement>;
}

const ConfirmDeleteModal = ({ handleClick, modalRef }: ModalProps) => (
  <dialog ref={modalRef} className="modal modal-bottom sm:modal-middle">
    <div className="modal-box">
      <h3 className="font-bold text-lg text-center">
        Are you sure you would like to delete the chat history?
      </h3>
      <p className="py-4">
        This action is irreversible and will permanently remove all chat history. Please confirm if you wish to proceed.
      </p>
      <div className="modal-action">
        <form method="dialog" className="flex w-full justify-between">
          <button className="btn btn-outline">
            <span className="text-sm font-bold">Cancel</span>
          </button>
          <button
            className="btn outline btn-success"
            onClick={() => handleClick()}
          >
            <span className="text-sm font-bold">Confirm</span>
          </button>
        </form>
      </div>
    </div>
  </dialog>
);

export default ConfirmDeleteModal;
