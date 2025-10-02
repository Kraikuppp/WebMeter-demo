import Swal, { SweetAlertIcon } from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

const useCustomSwal = () => {
  const Toast = MySwal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    },
  });

  const showSuccessToast = (message: string) => {
    Toast.fire({
      icon: 'success',
      title: message,
    });
  };

  const showErrorToast = (message: string) => {
    Toast.fire({
      icon: 'error',
      title: message,
    });
  };

  const showConfirmDialog = ({
    title = 'Are you sure?',
    text = 'You won\'t be able to revert this!',
    icon = 'warning' as SweetAlertIcon,
    confirmButtonText = 'Yes, do it!'
  }: {
    title?: string;
    text?: string;
    icon?: SweetAlertIcon;
    confirmButtonText?: string;
  }) => {
    return MySwal.fire({
      title,
      text,
      icon,
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText,
    });
  };

  return { showSuccessToast, showErrorToast, showConfirmDialog };
};

export default useCustomSwal;
export { useCustomSwal };
