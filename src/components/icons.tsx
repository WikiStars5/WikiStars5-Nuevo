import Image from 'next/image';

export function Logo(props: Partial<React.ComponentProps<typeof Image>>) {
  return (
    <Image
      src="https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/logo%2Festrellados%20(3).jpg?alt=media&token=4c5ff945-b737-4bd6-bb41-98b609c654c9"
      alt="Starryz5 Logo"
      width={24}
      height={24}
      className={props.className}
      {...props}
    />
  );
}
