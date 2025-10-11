import { RestReflectionCard } from "@/components/core/rest-reflection-card"
import Layout from "@/components/layout"

export default function RestPage() {
  return (
    <Layout title="REST API Testing" breadcrumbs={[{ label: "REST API Testing" }]}>
      <RestReflectionCard />
    </Layout>
  )
}