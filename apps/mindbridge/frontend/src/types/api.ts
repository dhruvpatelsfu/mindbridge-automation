export interface HealthResponse {
  ok: boolean
  config: string
  version: string
}

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced'

export interface Course {
  id: string
  title: string
  subject: string
  level: CourseLevel
  price: number
}

export interface SampleResponse {
  courses: Course[]
}

export interface LabInfoResponse {
  labId: string
  description?: string
  defects: Record<string, boolean>
}

export interface ApiErrorPayload {
  error: {
    code: string
    message: string
    fields?: Array<{ field: string; message: string }>
  }
}

export interface CourseSummary {
  id: string
  title: string
  subject: string
  level: CourseLevel
  price: number
  description: string
  image: string
  instructorId: string
  instructorName?: string
  featured?: boolean
  createdAt: string
  updatedAt: string
}

export interface CourseDetail extends Omit<CourseSummary, 'instructorId' | 'instructorName'> {
  instructor: { id: string; name: string }
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface CoursesListResponse {
  courses: CourseSummary[]
  pagination: PaginationMeta
}

export interface CourseDetailResponse {
  course: CourseDetail
}

export interface CartLine {
  courseId: string
  title: string
  price: number
  quantity: number
}

export interface Cart {
  items: CartLine[]
  itemCount: number
  subtotal: number
  total: number
}

export interface CartResponse {
  cart: Cart
}

export interface OrderEnrolment {
  id: string
  courseId: string
  courseTitle: string
  status: 'active'
  enrolledAt: string
}

export interface Order {
  id: string
  userId: string
  amount: number
  status: 'mock-paid'
  createdAt: string
  last4: string
  enrolments: OrderEnrolment[]
}

export interface CheckoutResponse {
  order: Order
}

export interface CheckoutRequestBody {
  mockCard: {
    number: string
    expiry: string
    cvv: string
  }
  zip: string
}

export type UserRole = 'user' | 'admin'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: string
}

export interface AuthResponse {
  user: User
}

export interface DashboardEnrolmentCourse {
  id: string
  title: string
  subject: string
  level: CourseLevel
  image: string
}

export interface DashboardEnrolment {
  id: string
  course: DashboardEnrolmentCourse
  status: 'active' | 'completed' | 'cancelled'
  enrolledAt: string
}

export interface MyEnrolmentsResponse {
  enrolments: DashboardEnrolment[]
}

export interface AdminCoursesListResponse {
  courses: CourseSummary[]
  pagination: PaginationMeta
}

export interface AdminUsersListResponse {
  users: User[]
  pagination: PaginationMeta
}

export type SubscriptionTier = 'free' | 'pro'

export interface Profile {
  userId: string
  name: string
  email: string
  dateOfBirth: string | null
  region: string | null
  subscriptionTier: SubscriptionTier | null
  updatedAt: string
}

export interface ProfileResponse {
  profile: Profile
}

export interface DashboardGrade {
  courseId: string
  courseTitle: string
  grade: string
  updatedAt: string
}

export interface DashboardSession {
  courseId: string
  courseTitle: string
  tutorName: string
  scheduledAt: string
}

export interface DashboardActivity {
  id: string
  type: 'enrolment' | 'payment' | 'profile_update'
  description: string
  occurredAt: string
}

export interface DashboardSummary {
  grades: DashboardGrade[]
  upcomingSessions: DashboardSession[]
  recentActivity: DashboardActivity[]
}

export interface ShareLinkResponse {
  url: string
}

export interface PracticeResponse {
  topic: string
  questions: string[]
}

export interface EnrollmentResponse {
  enrolmentId: string
}
