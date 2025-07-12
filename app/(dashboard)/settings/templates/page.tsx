import { TemplateManager } from '@/components/settings/template-manager'

export default function TemplatesSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Meeting Templates</h3>
        <p className="text-sm text-muted-foreground">
          Manage templates for different types of meetings to improve analysis accuracy
        </p>
      </div>
      <TemplateManager />
    </div>
  )
}