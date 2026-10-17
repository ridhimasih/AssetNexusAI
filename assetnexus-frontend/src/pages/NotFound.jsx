import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="page state">
      <h1>Page not found</h1>
      <Link className="btn btn-primary" to="/">Go to dashboard</Link>
    </div>
  )
}
