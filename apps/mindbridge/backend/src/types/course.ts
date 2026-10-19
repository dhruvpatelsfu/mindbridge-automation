export type CourseLevel = 'beginner' | 'intermediate' | 'advanced'

export interface CourseRow {
  id: string
  title: string
  subject: string
  level: CourseLevel
  price: number
  description: string
  image: string
  instructor_name: string
  instructor_id: string | null
  featured: number
  created_at: string
  updated_at: string
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
  instructorName: string
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

export interface OrderEnrolment {
  id: string
  courseId: string
  courseTitle: string
  status: 'active'
  enrolledAt: string
}

export interface Order {
  id: string
  amount: number
  status: 'mock-paid'
  createdAt: string
  last4: string
  enrolments: OrderEnrolment[]
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
  status: 'active'
  enrolledAt: string
}
