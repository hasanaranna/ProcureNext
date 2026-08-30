-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.user_invitations (
  invitation_id integer NOT NULL DEFAULT nextval('user_invitations_invitation_id_seq'::regclass),
  organization_id integer NOT NULL,
  invited_by integer NOT NULL,
  email character varying NOT NULL,
  token character varying NOT NULL UNIQUE,
  created_at timestamp without time zone DEFAULT now(),
  expires_at timestamp without time zone DEFAULT (now() + '7 days'::interval),
  status USER-DEFINED DEFAULT 'Pending'::invitation_status,
  CONSTRAINT user_invitations_pkey PRIMARY KEY (invitation_id)
);
CREATE TABLE public.users (
  user_id integer NOT NULL DEFAULT nextval('users_user_id_seq'::regclass),
  full_name character varying,
  email character varying NOT NULL UNIQUE,
  nid numeric NOT NULL UNIQUE,
  date_of_birth timestamp without time zone NOT NULL,
  password_hash text NOT NULL,
  phone character varying,
  is_2fa_enabled boolean DEFAULT false,
  status USER-DEFINED DEFAULT 'Pending'::user_status,
  last_login_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  refresh_token text,
  CONSTRAINT users_pkey PRIMARY KEY (user_id)
);
CREATE TABLE public.admins (
  admin_id integer NOT NULL DEFAULT nextval('admins_admin_id_seq'::regclass),
  user_id integer NOT NULL,
  admin_role USER-DEFINED NOT NULL,
  CONSTRAINT admins_pkey PRIMARY KEY (admin_id),
  CONSTRAINT admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.user_verification (
  user_id integer NOT NULL,
  verified_by integer,
  nid_front_file_path text,
  nid_back_file_path text,
  review_status USER-DEFINED DEFAULT 'Pending'::review_status_enum,
  verified_at timestamp without time zone,
  CONSTRAINT user_verification_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_verification_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT user_verification_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.admins(admin_id)
);
CREATE TABLE public.organizations (
  organization_id integer NOT NULL DEFAULT nextval('organizations_organization_id_seq'::regclass),
  primary_contact integer,
  organization_name character varying NOT NULL,
  organization_type USER-DEFINED NOT NULL DEFAULT 'Buyer'::organization_type,
  address text,
  website character varying,
  description text,
  verification_status USER-DEFINED DEFAULT 'Pending'::verification_status,
  tin_number text,
  bin_number text,
  credit_balance integer DEFAULT 250,
  unique_join_code character varying UNIQUE,
  org_embedding USER-DEFINED,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT organizations_pkey PRIMARY KEY (organization_id),
  CONSTRAINT organizations_primary_contact_fkey FOREIGN KEY (primary_contact) REFERENCES public.users(user_id)
);
CREATE TABLE public.organization_employees (
  org_user_id integer NOT NULL DEFAULT nextval('organization_employees_org_user_id_seq'::regclass),
  organization_id integer NOT NULL,
  user_id integer NOT NULL,
  role_in_org USER-DEFINED NOT NULL,
  joined_at timestamp without time zone DEFAULT now(),
  CONSTRAINT organization_employees_pkey PRIMARY KEY (org_user_id),
  CONSTRAINT organization_employees_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(organization_id),
  CONSTRAINT organization_employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.document_types (
  type_id integer NOT NULL DEFAULT nextval('document_types_type_id_seq'::regclass),
  type_name character varying NOT NULL UNIQUE,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT document_types_pkey PRIMARY KEY (type_id)
);
CREATE TABLE public.organization_documents (
  document_id integer NOT NULL DEFAULT nextval('organization_documents_document_id_seq'::regclass),
  organization_id integer NOT NULL,
  reviewed_by integer,
  document_type_id integer NOT NULL,
  file_path text NOT NULL,
  review_status USER-DEFINED DEFAULT 'Pending'::review_status_enum,
  review_notes text,
  reviewed_at timestamp without time zone,
  uploaded_at timestamp without time zone DEFAULT now(),
  CONSTRAINT organization_documents_pkey PRIMARY KEY (document_id),
  CONSTRAINT organization_documents_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(organization_id),
  CONSTRAINT organization_documents_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.admins(admin_id),
  CONSTRAINT organization_documents_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES public.document_types(type_id)
);
CREATE TABLE public.enlisted_vendors (
  org_id integer NOT NULL,
  enlisted_org_id integer NOT NULL,
  enlisted_by integer,
  enlisted_at timestamp without time zone DEFAULT now(),
  CONSTRAINT enlisted_vendors_pkey PRIMARY KEY (org_id, enlisted_org_id),
  CONSTRAINT enlisted_vendors_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(organization_id),
  CONSTRAINT enlisted_vendors_enlisted_org_id_fkey FOREIGN KEY (enlisted_org_id) REFERENCES public.organizations(organization_id),
  CONSTRAINT enlisted_vendors_enlisted_by_fkey FOREIGN KEY (enlisted_by) REFERENCES public.organization_employees(org_user_id)
);
CREATE TABLE public.procurement_nature (
  nature_id integer NOT NULL DEFAULT nextval('procurement_nature_nature_id_seq'::regclass),
  name USER-DEFINED NOT NULL UNIQUE,
  CONSTRAINT procurement_nature_pkey PRIMARY KEY (nature_id)
);
CREATE TABLE public.procurement_method (
  method_id integer NOT NULL DEFAULT nextval('procurement_method_method_id_seq'::regclass),
  method_code USER-DEFINED NOT NULL UNIQUE,
  description text,
  CONSTRAINT procurement_method_pkey PRIMARY KEY (method_id)
);
CREATE TABLE public.tender_categories (
  category_id integer NOT NULL DEFAULT nextval('tender_categories_category_id_seq'::regclass),
  parent_id integer,
  category_name character varying NOT NULL,
  CONSTRAINT tender_categories_pkey PRIMARY KEY (category_id),
  CONSTRAINT tender_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.tender_categories(category_id)
);
CREATE TABLE public.tenders (
  tender_id integer NOT NULL DEFAULT nextval('tenders_tender_id_seq'::regclass),
  buyer_id integer NOT NULL,
  created_by integer NOT NULL,
  category_id integer,
  nature_id integer,
  method_id integer,
  title character varying NOT NULL,
  description text NOT NULL,
  visibility_type USER-DEFINED DEFAULT 'Public'::tender_visibility,
  budget_min numeric,
  budget_max numeric,
  security_required boolean DEFAULT false,
  security_valid_until date,
  proposal_valid_until date,
  tender_public_date timestamp without time zone,
  pre_bid_meeting timestamp without time zone,
  tender_opening_date timestamp without time zone,
  submission_deadline timestamp without time zone,
  status USER-DEFINED DEFAULT 'Draft'::tender_status,
  embedding USER-DEFINED,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  eligibility_of_tenderer text,
  CONSTRAINT tenders_pkey PRIMARY KEY (tender_id),
  CONSTRAINT tenders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.organizations(organization_id),
  CONSTRAINT tenders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.organization_employees(org_user_id),
  CONSTRAINT tenders_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.tender_categories(category_id),
  CONSTRAINT tenders_nature_id_fkey FOREIGN KEY (nature_id) REFERENCES public.procurement_nature(nature_id),
  CONSTRAINT tenders_method_id_fkey FOREIGN KEY (method_id) REFERENCES public.procurement_method(method_id)
);
CREATE TABLE public.tender_documents (
  tender_doc_id integer NOT NULL DEFAULT nextval('tender_documents_tender_doc_id_seq'::regclass),
  tender_id integer NOT NULL,
  file_name character varying,
  file_path text,
  uploaded_at timestamp without time zone DEFAULT now(),
  CONSTRAINT tender_documents_pkey PRIMARY KEY (tender_doc_id),
  CONSTRAINT tender_documents_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(tender_id)
);
CREATE TABLE public.tender_invitations (
  invitation_id integer NOT NULL DEFAULT nextval('tender_invitations_invitation_id_seq'::regclass),
  tender_id integer NOT NULL,
  vendor_org_id integer NOT NULL,
  invited_at timestamp without time zone DEFAULT now(),
  invitation_status USER-DEFINED DEFAULT 'Pending'::invitation_status,
  CONSTRAINT tender_invitations_pkey PRIMARY KEY (invitation_id),
  CONSTRAINT tender_invitations_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(tender_id),
  CONSTRAINT tender_invitations_vendor_org_id_fkey FOREIGN KEY (vendor_org_id) REFERENCES public.organizations(organization_id)
);
CREATE TABLE public.tender_vendor_suggestions (
  suggestion_id integer NOT NULL DEFAULT nextval('tender_vendor_suggestions_suggestion_id_seq'::regclass),
  tender_id integer NOT NULL,
  vendor_org_id integer NOT NULL,
  similarity_score numeric,
  suggested_at timestamp without time zone DEFAULT now(),
  status USER-DEFINED DEFAULT 'Pending'::suggestion_status,
  CONSTRAINT tender_vendor_suggestions_pkey PRIMARY KEY (suggestion_id),
  CONSTRAINT tender_vendor_suggestions_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(tender_id),
  CONSTRAINT tender_vendor_suggestions_vendor_org_id_fkey FOREIGN KEY (vendor_org_id) REFERENCES public.organizations(organization_id)
);
CREATE TABLE public.bids (
  bid_id integer NOT NULL DEFAULT nextval('bids_bid_id_seq'::regclass),
  vendor_org_id integer NOT NULL,
  submitted_by integer NOT NULL,
  tender_id integer NOT NULL,
  financial_amount numeric,
  status USER-DEFINED DEFAULT 'Draft'::bid_status,
  submitted_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  description text,
  CONSTRAINT bids_pkey PRIMARY KEY (bid_id),
  CONSTRAINT bids_vendor_org_id_fkey FOREIGN KEY (vendor_org_id) REFERENCES public.organizations(organization_id),
  CONSTRAINT bids_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.organization_employees(org_user_id),
  CONSTRAINT bids_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(tender_id)
);
CREATE TABLE public.bid_documents (
  bid_doc_id integer NOT NULL DEFAULT nextval('bid_documents_bid_doc_id_seq'::regclass),
  bid_id integer NOT NULL,
  req_doc_id integer NOT NULL,
  file_path text,
  uploaded_at timestamp without time zone DEFAULT now(),
  CONSTRAINT bid_documents_pkey PRIMARY KEY (bid_doc_id),
  CONSTRAINT bid_documents_bid_id_fkey FOREIGN KEY (bid_id) REFERENCES public.bids(bid_id),
  CONSTRAINT bid_documents_req_doc_id_fkey FOREIGN KEY (req_doc_id) REFERENCES public.tender_required_documents(req_doc_id)
);
CREATE TABLE public.bid_securities (
  security_id integer NOT NULL DEFAULT nextval('bid_securities_security_id_seq'::regclass),
  bid_id integer NOT NULL,
  security_amount numeric,
  security_type USER-DEFINED,
  bid_security_doc_path text,
  submitted_at timestamp without time zone DEFAULT now(),
  valid_until date,
  CONSTRAINT bid_securities_pkey PRIMARY KEY (security_id),
  CONSTRAINT bid_securities_bid_id_fkey FOREIGN KEY (bid_id) REFERENCES public.bids(bid_id)
);
CREATE TABLE public.awards (
  award_id integer NOT NULL DEFAULT nextval('awards_award_id_seq'::regclass),
  winning_bid_id integer NOT NULL,
  awarded_by integer NOT NULL,
  tender_id integer NOT NULL,
  remarks text,
  awarded_at timestamp without time zone DEFAULT now(),
  CONSTRAINT awards_pkey PRIMARY KEY (award_id),
  CONSTRAINT awards_winning_bid_id_fkey FOREIGN KEY (winning_bid_id) REFERENCES public.bids(bid_id),
  CONSTRAINT awards_awarded_by_fkey FOREIGN KEY (awarded_by) REFERENCES public.organization_employees(org_user_id),
  CONSTRAINT awards_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(tender_id)
);
CREATE TABLE public.contracts (
  contract_id integer NOT NULL DEFAULT nextval('contracts_contract_id_seq'::regclass),
  award_id integer NOT NULL,
  contract_value numeric,
  signed_at timestamp without time zone,
  contract_document_path text,
  estimated_end_date date,
  status USER-DEFINED DEFAULT 'Active'::contract_status,
  CONSTRAINT contracts_pkey PRIMARY KEY (contract_id),
  CONSTRAINT contracts_award_id_fkey FOREIGN KEY (award_id) REFERENCES public.awards(award_id)
);
CREATE TABLE public.vendor_performance (
  performance_id integer NOT NULL DEFAULT nextval('vendor_performance_performance_id_seq'::regclass),
  vendor_org_id integer NOT NULL,
  contract_id integer NOT NULL,
  rating numeric CHECK (rating >= 1::numeric AND rating <= 5::numeric),
  feedback text,
  completion_status USER-DEFINED,
  recorded_at timestamp without time zone DEFAULT now(),
  embedding USER-DEFINED,
  CONSTRAINT vendor_performance_pkey PRIMARY KEY (performance_id),
  CONSTRAINT vendor_performance_vendor_org_id_fkey FOREIGN KEY (vendor_org_id) REFERENCES public.organizations(organization_id),
  CONSTRAINT vendor_performance_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(contract_id)
);
CREATE TABLE public.payments (
  transaction_id integer NOT NULL DEFAULT nextval('payments_transaction_id_seq'::regclass),
  organization_id integer NOT NULL,
  amount numeric NOT NULL,
  gateway_transaction_id character varying,
  gateway_validation_id character varying,
  status character varying,
  paid_at timestamp without time zone DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (transaction_id),
  CONSTRAINT payments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(organization_id)
);
CREATE TABLE public.credit_transactions (
  transaction_id integer NOT NULL DEFAULT nextval('credit_transactions_transaction_id_seq'::regclass),
  organization_id integer NOT NULL,
  payment_id integer,
  amount numeric NOT NULL,
  transaction_type USER-DEFINED NOT NULL,
  payment_reference character varying,
  balance_after numeric,
  created_at timestamp without time zone DEFAULT now(),
  user_id integer,
  description text,
  payment_method character varying,
  CONSTRAINT credit_transactions_pkey PRIMARY KEY (transaction_id),
  CONSTRAINT credit_transactions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(organization_id),
  CONSTRAINT credit_transactions_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(transaction_id),
  CONSTRAINT credit_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.credit_discounts (
  org_id integer NOT NULL,
  issued_by integer,
  discounted_credit_price numeric,
  valid_from timestamp without time zone,
  valid_until timestamp without time zone,
  is_active boolean DEFAULT true,
  CONSTRAINT credit_discounts_pkey PRIMARY KEY (org_id),
  CONSTRAINT credit_discounts_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(organization_id),
  CONSTRAINT credit_discounts_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.admins(admin_id)
);
CREATE TABLE public.notification_types (
  type_id integer NOT NULL DEFAULT nextval('notification_types_type_id_seq'::regclass),
  type_name character varying NOT NULL UNIQUE,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT notification_types_pkey PRIMARY KEY (type_id)
);
CREATE TABLE public.notification_recipients (
  recipient_id integer NOT NULL DEFAULT nextval('notification_recipients_recipient_id_seq'::regclass),
  notification_id integer NOT NULL,
  org_user_id integer NOT NULL,
  is_read boolean DEFAULT false,
  read_at timestamp without time zone,
  CONSTRAINT notification_recipients_pkey PRIMARY KEY (recipient_id),
  CONSTRAINT notification_recipients_org_user_id_fkey FOREIGN KEY (org_user_id) REFERENCES public.organization_employees(org_user_id)
);
CREATE TABLE public.user_notifications (
  notification_id integer NOT NULL DEFAULT nextval('user_notifications_notification_id_seq'::regclass),
  user_id integer NOT NULL,
  title character varying,
  message text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT user_notifications_pkey PRIMARY KEY (notification_id),
  CONSTRAINT user_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.org_messages_private (
  message_id integer NOT NULL DEFAULT nextval('org_messages_private_message_id_seq'::regclass),
  sender_user_id integer NOT NULL,
  receiver_user_id integer NOT NULL,
  message text,
  sent_time timestamp without time zone DEFAULT now(),
  is_read boolean DEFAULT false,
  read_time timestamp without time zone,
  CONSTRAINT org_messages_private_pkey PRIMARY KEY (message_id),
  CONSTRAINT org_messages_private_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES public.users(user_id),
  CONSTRAINT org_messages_private_receiver_user_id_fkey FOREIGN KEY (receiver_user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.group_chat (
  message_id integer NOT NULL DEFAULT nextval('group_chat_message_id_seq'::regclass),
  org_id integer NOT NULL,
  sender_id integer NOT NULL,
  message text,
  sent_time timestamp without time zone DEFAULT now(),
  CONSTRAINT group_chat_pkey PRIMARY KEY (message_id),
  CONSTRAINT group_chat_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(organization_id),
  CONSTRAINT group_chat_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.organization_employees(org_user_id)
);
CREATE TABLE public.group_msg_seen (
  msg_id integer NOT NULL,
  member_id integer NOT NULL,
  is_read boolean DEFAULT false,
  read_time timestamp without time zone,
  CONSTRAINT group_msg_seen_pkey PRIMARY KEY (msg_id, member_id),
  CONSTRAINT group_msg_seen_msg_id_fkey FOREIGN KEY (msg_id) REFERENCES public.group_chat(message_id),
  CONSTRAINT group_msg_seen_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.organization_employees(org_user_id)
);
CREATE TABLE public.tender_chat_rooms (
  room_id integer NOT NULL DEFAULT nextval('tender_chat_rooms_room_id_seq'::regclass),
  vendor_org_id integer NOT NULL,
  buyer_org_id integer NOT NULL,
  tender_id integer NOT NULL,
  status USER-DEFINED DEFAULT 'Active'::chat_room_status,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT tender_chat_rooms_pkey PRIMARY KEY (room_id),
  CONSTRAINT tender_chat_rooms_vendor_org_id_fkey FOREIGN KEY (vendor_org_id) REFERENCES public.organizations(organization_id),
  CONSTRAINT tender_chat_rooms_buyer_org_id_fkey FOREIGN KEY (buyer_org_id) REFERENCES public.organizations(organization_id),
  CONSTRAINT tender_chat_rooms_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(tender_id)
);
CREATE TABLE public.tender_chat_participants (
  room_id integer NOT NULL,
  org_user_id integer NOT NULL,
  added_by integer,
  role USER-DEFINED DEFAULT 'Member'::chat_role,
  joined_at timestamp without time zone DEFAULT now(),
  removed_at timestamp without time zone,
  CONSTRAINT tender_chat_participants_pkey PRIMARY KEY (room_id, org_user_id),
  CONSTRAINT tender_chat_participants_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.tender_chat_rooms(room_id),
  CONSTRAINT tender_chat_participants_org_user_id_fkey FOREIGN KEY (org_user_id) REFERENCES public.organization_employees(org_user_id),
  CONSTRAINT tender_chat_participants_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.organization_employees(org_user_id)
);
CREATE TABLE public.tender_chat_messages (
  message_id integer NOT NULL DEFAULT nextval('tender_chat_messages_message_id_seq'::regclass),
  room_id integer NOT NULL,
  sender_id integer NOT NULL,
  message text,
  sent_at timestamp without time zone DEFAULT now(),
  is_deleted boolean DEFAULT false,
  CONSTRAINT tender_chat_messages_pkey PRIMARY KEY (message_id),
  CONSTRAINT tender_chat_messages_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.tender_chat_rooms(room_id),
  CONSTRAINT tender_chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.organization_employees(org_user_id)
);
CREATE TABLE public.tender_chat_seen (
  message_id integer NOT NULL,
  org_user_id integer NOT NULL,
  read_at timestamp without time zone,
  CONSTRAINT tender_chat_seen_pkey PRIMARY KEY (message_id, org_user_id),
  CONSTRAINT tender_chat_seen_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.tender_chat_messages(message_id),
  CONSTRAINT tender_chat_seen_org_user_id_fkey FOREIGN KEY (org_user_id) REFERENCES public.organization_employees(org_user_id)
);
CREATE TABLE public.message_threads (
  thread_id integer NOT NULL DEFAULT nextval('message_threads_thread_id_seq'::regclass),
  thread_type USER-DEFINED NOT NULL DEFAULT 'IntraCompany'::thread_type,
  tender_id integer,
  group_name character varying,
  created_by integer NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT message_threads_pkey PRIMARY KEY (thread_id),
  CONSTRAINT message_threads_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(tender_id),
  CONSTRAINT message_threads_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id)
);
CREATE TABLE public.thread_participants (
  id integer NOT NULL DEFAULT nextval('thread_participants_id_seq'::regclass),
  thread_id integer NOT NULL,
  user_id integer NOT NULL,
  organization_id integer NOT NULL,
  is_admin boolean DEFAULT false,
  joined_at timestamp without time zone DEFAULT now(),
  last_read_at timestamp without time zone,
  CONSTRAINT thread_participants_pkey PRIMARY KEY (id),
  CONSTRAINT thread_participants_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.message_threads(thread_id),
  CONSTRAINT thread_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT thread_participants_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(organization_id)
);
CREATE TABLE public.messages (
  message_id integer NOT NULL DEFAULT nextval('messages_message_id_seq'::regclass),
  thread_id integer NOT NULL,
  sender_user_id integer NOT NULL,
  message_text text NOT NULL,
  encryption_iv text NOT NULL,
  sent_at timestamp without time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (message_id),
  CONSTRAINT messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.message_threads(thread_id),
  CONSTRAINT messages_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.tender_required_documents (
  req_doc_id integer NOT NULL DEFAULT nextval('tender_required_documents_req_doc_id_seq'::regclass),
  tender_id integer NOT NULL,
  doc_type_id integer,
  custom_doc_name character varying,
  is_mandatory boolean DEFAULT true,
  allowed_roles ARRAY NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT tender_required_documents_pkey PRIMARY KEY (req_doc_id),
  CONSTRAINT tender_required_documents_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(tender_id),
  CONSTRAINT tender_required_documents_doc_type_id_fkey FOREIGN KEY (doc_type_id) REFERENCES public.document_types(type_id)
);
CREATE TABLE public.audit_outbox (
  outbox_id bigint NOT NULL DEFAULT nextval('audit_outbox_outbox_id_seq'::regclass),
  event_uuid uuid NOT NULL DEFAULT gen_random_uuid(),
  action_type character varying NOT NULL,
  entity_type character varying NOT NULL,
  entity_id character varying NOT NULL,
  user_id integer,
  user_email character varying,
  ip_address character varying,
  user_agent character varying,
  old_values jsonb,
  new_values jsonb,
  change_diff jsonb,
  status character varying NOT NULL DEFAULT 'PENDING'::character varying,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone,
  CONSTRAINT audit_outbox_pkey PRIMARY KEY (outbox_id),
  CONSTRAINT audit_outbox_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.audit_logs (
  log_id bigint NOT NULL DEFAULT nextval('audit_logs_log_id_seq'::regclass),
  sequence_number bigint NOT NULL UNIQUE,
  event_uuid uuid NOT NULL UNIQUE,
  user_id integer,
  user_email character varying,
  action_type character varying NOT NULL,
  entity_type character varying NOT NULL,
  entity_id character varying NOT NULL,
  old_values jsonb,
  new_values jsonb,
  change_diff jsonb,
  ip_address character varying,
  user_agent character varying,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  previous_hash character varying NOT NULL,
  payload_hash character varying NOT NULL,
  hash_signature character varying NOT NULL,
  CONSTRAINT audit_logs_pkey PRIMARY KEY (log_id),
  CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.audit_archives (
  archive_id bigint NOT NULL DEFAULT nextval('audit_archives_archive_id_seq'::regclass),
  batch_reference character varying NOT NULL UNIQUE,
  sequence_start bigint NOT NULL,
  sequence_end bigint NOT NULL,
  record_count integer NOT NULL,
  genesis_hash character varying NOT NULL,
  terminal_hash character varying NOT NULL,
  merkle_root character varying NOT NULL,
  storage_path character varying NOT NULL,
  file_size_bytes bigint NOT NULL,
  sealed_at timestamp with time zone NOT NULL DEFAULT now(),
  verified_at timestamp with time zone,
  CONSTRAINT audit_archives_pkey PRIMARY KEY (archive_id)
);
CREATE TABLE public.platform_pricing (
  pricing_id integer NOT NULL DEFAULT nextval('platform_pricing_pricing_id_seq'::regclass),
  price_per_token numeric NOT NULL DEFAULT 1.00,
  tender_publish_cost integer NOT NULL DEFAULT 50,
  bid_cost integer NOT NULL DEFAULT 20,
  updated_by integer,
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT platform_pricing_pkey PRIMARY KEY (pricing_id),
  CONSTRAINT platform_pricing_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id)
);
CREATE TABLE public.token_packages (
  package_id integer NOT NULL DEFAULT nextval('token_packages_package_id_seq'::regclass),
  package_name character varying NOT NULL,
  token_amount integer NOT NULL CHECK (token_amount > 0),
  price_bdt numeric NOT NULL CHECK (price_bdt > 0::numeric),
  badge character varying,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT token_packages_pkey PRIMARY KEY (package_id)
);
CREATE TABLE public.notifications (
  notification_id integer NOT NULL DEFAULT nextval('notifications_notification_id_seq'::regclass),
  user_id integer NOT NULL,
  title character varying NOT NULL,
  message text NOT NULL,
  type character varying NOT NULL DEFAULT 'System'::character varying,
  action_url character varying,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (notification_id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.bid_evaluation_runs (
  id integer NOT NULL DEFAULT nextval('bid_evaluation_runs_id_seq'::regclass),
  tender_id integer NOT NULL,
  triggered_by_user_id integer NOT NULL,
  triggered_at timestamp without time zone NOT NULL DEFAULT now(),
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'running'::character varying, 'completed'::character varying, 'failed'::character varying, 'partial'::character varying]::text[])),
  model_name character varying,
  model_version character varying,
  prompt_version character varying,
  weight_config jsonb NOT NULL,
  error_message text,
  completed_at timestamp without time zone,
  CONSTRAINT bid_evaluation_runs_pkey PRIMARY KEY (id),
  CONSTRAINT bid_evaluation_runs_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(tender_id),
  CONSTRAINT bid_evaluation_runs_triggered_by_user_id_fkey FOREIGN KEY (triggered_by_user_id) REFERENCES public.organization_employees(org_user_id)
);
CREATE TABLE public.bid_evaluations (
  id integer NOT NULL DEFAULT nextval('bid_evaluations_id_seq'::regclass),
  evaluation_run_id integer NOT NULL,
  bid_id integer NOT NULL,
  financial_score numeric,
  financial_note text,
  is_low_outlier boolean NOT NULL DEFAULT false,
  document_score numeric,
  missing_documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  semantic_relevance_score jsonb,
  llm_subscores jsonb,
  composite_score numeric,
  raw_llm_response jsonb,
  row_status character varying NOT NULL DEFAULT 'success'::character varying CHECK (row_status::text = ANY (ARRAY['success'::character varying, 'needs_review'::character varying, 'failed'::character varying]::text[])),
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT bid_evaluations_pkey PRIMARY KEY (id),
  CONSTRAINT bid_evaluations_evaluation_run_id_fkey FOREIGN KEY (evaluation_run_id) REFERENCES public.bid_evaluation_runs(id),
  CONSTRAINT bid_evaluations_bid_id_fkey FOREIGN KEY (bid_id) REFERENCES public.bids(bid_id)
);