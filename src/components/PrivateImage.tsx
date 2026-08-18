import { AnchorHTMLAttributes, ImgHTMLAttributes, ReactNode, useEffect, useState } from 'react';
import { signedImageUrl } from '@/lib/storage';

interface PrivateImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  bucket: string;
  src?: string | null;
}

export function PrivateImage({ bucket, src, ...rest }: PrivateImageProps) {
  const [resolved, setResolved] = useState<string>(src || '');

  useEffect(() => {
    let active = true;
    if (!src) {
      setResolved('');
      return;
    }
    signedImageUrl(bucket, src).then((url) => {
      if (active) setResolved(url);
    });
    return () => {
      active = false;
    };
  }, [bucket, src]);

  return <img src={resolved} {...rest} />;
}

interface PrivateLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  bucket: string;
  href?: string | null;
  children?: ReactNode;
}

export function PrivateLink({ bucket, href, children, ...rest }: PrivateLinkProps) {
  const [resolved, setResolved] = useState<string>(href || '');

  useEffect(() => {
    let active = true;
    if (!href) {
      setResolved('');
      return;
    }
    signedImageUrl(bucket, href).then((url) => {
      if (active) setResolved(url);
    });
    return () => {
      active = false;
    };
  }, [bucket, href]);

  return (
    <a href={resolved || undefined} {...rest}>
      {children}
    </a>
  );
}