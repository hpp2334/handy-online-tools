import { AppBar } from "@/widgets/appbar";
import { Title } from "@/widgets/components";
import { Features } from "@/widgets/features";
import { CommonLayout } from "@/widgets/layout";
import { MainCard } from "@/widgets/main-card";
import { SEOHead } from "@/widgets/seo";

export default function Home() {
  return (
    <>
      <SEOHead subTitle="Home" description="homepage" />
      <AppBar title="Handy Online Tools" />
      <CommonLayout>
        <Features />
      </CommonLayout>
    </>
  );
}
