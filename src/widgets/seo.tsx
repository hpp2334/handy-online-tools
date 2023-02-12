import Head from "next/head";

export interface SEOHeadProps {
  subTitle: string;
  description: string;
}

export function SEOHead({ subTitle, description }: SEOHeadProps) {
  // make <title> receive only one child
  const title = `${subTitle} - Handy Online Tools`;

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="icon" href="/favicon.ico" />
    </Head>
  );
}
