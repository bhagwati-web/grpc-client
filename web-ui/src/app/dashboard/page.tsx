import { ReflectionCardWithForm } from "@/components/core/reflection-card"
import Layout from "@/components/layout"

export default function Page() {
  return (
    <Layout title="gRPC Data Fetching" breadcrumbs={[{ label: "gRPC Data Fetching" }]}>
      <ReflectionCardWithForm />
    </Layout>
  )
}
