'use client'

import { Admin, Resource, List, Datagrid, TextField, DateField, EmailField, BooleanField, NumberField, SelectField, EditButton, ShowButton, DeleteButton, Create, Edit, SimpleForm, TextInput, BooleanInput, SelectInput, NumberInput, Show, SimpleShowLayout, useRecordContext, TopToolbar, CreateButton, ExportButton, FilterButton } from 'react-admin'
import supabaseDataProvider from '@/lib/admin/supabase-data-provider'
import { Card } from '@/components/ui/card'
import { Users, Building2, Ticket, CreditCard, BarChart3, Settings, FileText, Webhook } from 'lucide-react'

// Custom theme to match your app
const theme = {
  palette: {
    mode: 'light',
    primary: {
      main: '#3b82f6',
    },
    secondary: {
      main: '#10b981',
    },
  },
  typography: {
    fontFamily: ['Inter', 'system-ui', 'sans-serif'].join(','),
  },
  components: {
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
    },
    MuiFormControl: {
      defaultProps: {
        size: 'small',
      },
    },
  },
}

// User Management
const UserList = () => (
  <List>
    <Datagrid rowClick="show">
      <TextField source="id" />
      <EmailField source="email" />
      <TextField source="full_name" label="Name" />
      <TextField source="role" />
      <BooleanField source="is_active" />
      <DateField source="created_at" />
      <DateField source="last_login" />
      <EditButton />
      <ShowButton />
    </Datagrid>
  </List>
)

const UserEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="email" disabled />
      <TextInput source="full_name" label="Name" />
      <SelectInput source="role" choices={[
        { id: 'user', name: 'User' },
        { id: 'admin', name: 'Admin' },
        { id: 'owner', name: 'Owner' },
      ]} />
      <BooleanInput source="is_active" />
      <TextInput source="phone_number" />
      <TextInput source="company_name" />
    </SimpleForm>
  </Edit>
)

// Organization Management
const OrganizationList = () => (
  <List>
    <Datagrid rowClick="show">
      <TextField source="id" />
      <TextField source="name" />
      <TextField source="slug" />
      <SelectField source="subscription_tier" choices={[
        { id: 'free', name: 'Free' },
        { id: 'starter', name: 'Starter' },
        { id: 'professional', name: 'Professional' },
        { id: 'enterprise', name: 'Enterprise' },
      ]} />
      <NumberField source="monthly_minutes_used" />
      <NumberField source="monthly_minutes_limit" />
      <DateField source="created_at" />
      <EditButton />
      <ShowButton />
    </Datagrid>
  </List>
)

// Support Tickets
const TicketList = () => {
  const ListActions = () => (
    <TopToolbar>
      <FilterButton />
      <CreateButton />
      <ExportButton />
    </TopToolbar>
  )

  return (
    <List actions={<ListActions />} filters={[
      <SelectInput source="status" choices={[
        { id: 'open', name: 'Open' },
        { id: 'in_progress', name: 'In Progress' },
        { id: 'resolved', name: 'Resolved' },
        { id: 'closed', name: 'Closed' },
      ]} alwaysOn />,
      <SelectInput source="priority" choices={[
        { id: 'low', name: 'Low' },
        { id: 'medium', name: 'Medium' },
        { id: 'high', name: 'High' },
        { id: 'urgent', name: 'Urgent' },
      ]} />,
    ]}>
      <Datagrid rowClick="show">
        <TextField source="ticket_number" />
        <TextField source="subject" />
        <EmailField source="customer_email" />
        <SelectField source="type" choices={[
          { id: 'technical_support', name: 'Technical' },
          { id: 'billing_issue', name: 'Billing' },
          { id: 'feature_request', name: 'Feature Request' },
          { id: 'transcription_failed', name: 'Transcription Failed' },
        ]} />
        <SelectField source="status" choices={[
          { id: 'open', name: 'Open' },
          { id: 'in_progress', name: 'In Progress' },
          { id: 'resolved', name: 'Resolved' },
          { id: 'closed', name: 'Closed' },
        ]} />
        <SelectField source="priority" choices={[
          { id: 'low', name: 'Low' },
          { id: 'medium', name: 'Medium' },
          { id: 'high', name: 'High' },
          { id: 'urgent', name: 'Urgent' },
        ]} />
        <DateField source="created_at" showTime />
        <EditButton />
      </Datagrid>
    </List>
  )
}

const TicketEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="subject" fullWidth />
      <TextInput source="description" multiline rows={4} fullWidth />
      <SelectInput source="status" choices={[
        { id: 'open', name: 'Open' },
        { id: 'in_progress', name: 'In Progress' },
        { id: 'resolved', name: 'Resolved' },
        { id: 'closed', name: 'Closed' },
      ]} />
      <SelectInput source="priority" choices={[
        { id: 'low', name: 'Low' },
        { id: 'medium', name: 'Medium' },
        { id: 'high', name: 'High' },
        { id: 'urgent', name: 'Urgent' },
      ]} />
      <TextInput source="resolution" multiline rows={4} fullWidth />
    </SimpleForm>
  </Edit>
)

// Meeting Management
const MeetingList = () => (
  <List>
    <Datagrid rowClick="show">
      <TextField source="id" />
      <TextField source="title" />
      <TextField source="status" />
      <NumberField source="duration_seconds" />
      <DateField source="created_at" showTime />
      <TextField source="source" />
      <ShowButton />
    </Datagrid>
  </List>
)

// Webhook Management
const WebhookList = () => (
  <List>
    <Datagrid rowClick="edit">
      <TextField source="name" />
      <SelectField source="type" choices={[
        { id: 'slack', name: 'Slack' },
        { id: 'teams', name: 'Teams' },
        { id: 'email', name: 'Email' },
        { id: 'webhook', name: 'Webhook' },
      ]} />
      <TextField source="webhook_url" />
      <BooleanField source="is_active" />
      <DateField source="created_at" />
      <EditButton />
      <DeleteButton />
    </Datagrid>
  </List>
)

// Custom Dashboard
const Dashboard = () => (
  <div className="p-6 space-y-6">
    <h1 className="text-3xl font-bold">HangJegyzet Admin Dashboard</h1>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Users</p>
            <p className="text-2xl font-bold">1,234</p>
          </div>
          <Users className="h-8 w-8 text-blue-500" />
        </div>
      </Card>
      
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Organizations</p>
            <p className="text-2xl font-bold">56</p>
          </div>
          <Building2 className="h-8 w-8 text-green-500" />
        </div>
      </Card>
      
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Open Tickets</p>
            <p className="text-2xl font-bold">23</p>
          </div>
          <Ticket className="h-8 w-8 text-orange-500" />
        </div>
      </Card>
      
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">MRR</p>
            <p className="text-2xl font-bold">€12,450</p>
          </div>
          <CreditCard className="h-8 w-8 text-purple-500" />
        </div>
      </Card>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-2">
          <p className="text-sm">New user registration: user@example.com</p>
          <p className="text-sm">Support ticket #123 resolved</p>
          <p className="text-sm">Organization "ACME Corp" upgraded to Professional</p>
        </div>
      </Card>
      
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">System Health</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>API Status</span>
            <span className="text-green-500">Operational</span>
          </div>
          <div className="flex justify-between">
            <span>Database</span>
            <span className="text-green-500">Healthy</span>
          </div>
          <div className="flex justify-between">
            <span>Queue Jobs</span>
            <span className="text-yellow-500">12 pending</span>
          </div>
        </div>
      </Card>
    </div>
  </div>
)

// Main Admin App
export default function ReactAdminApp() {
  const dataProvider = supabaseDataProvider()

  return (
    <Admin 
      dataProvider={dataProvider}
      dashboard={Dashboard}
      theme={theme}
      title="HangJegyzet Admin"
    >
      <Resource 
        name="profiles" 
        list={UserList} 
        edit={UserEdit}
        icon={Users}
        options={{ label: 'Users' }}
      />
      <Resource 
        name="organizations" 
        list={OrganizationList}
        icon={Building2}
        options={{ label: 'Organizations' }}
      />
      <Resource 
        name="support_tickets" 
        list={TicketList}
        edit={TicketEdit}
        icon={Ticket}
        options={{ label: 'Support Tickets' }}
      />
      <Resource 
        name="meetings" 
        list={MeetingList}
        icon={FileText}
        options={{ label: 'Meetings' }}
      />
      <Resource 
        name="webhooks" 
        list={WebhookList}
        icon={Webhook}
        options={{ label: 'Webhooks' }}
      />
    </Admin>
  )
}