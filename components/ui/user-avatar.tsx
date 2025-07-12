'use client'

import { OptimizedAvatar } from './optimized-image'
import { Avatar, AvatarImage, AvatarFallback } from './avatar'
import { User } from '@supabase/supabase-js'

interface UserAvatarProps {
  user: User | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showStatus?: boolean
  status?: 'online' | 'offline' | 'busy'
}

export function UserAvatar({
  user,
  size = 'md',
  className,
  showStatus = false,
  status = 'offline'
}: UserAvatarProps) {
  const getUserInitials = (email: string) => {
    const parts = email.split('@')[0].split('.')
    if (parts.length > 1) {
      return parts[0][0].toUpperCase() + parts[1][0].toUpperCase()
    }
    return parts[0].slice(0, 2).toUpperCase()
  }

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  }

  const statusSizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
    xl: 'h-4 w-4'
  }

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    busy: 'bg-red-500'
  }

  // Use optimized image for external URLs
  if (user?.user_metadata?.avatar_url && 
      (user.user_metadata.avatar_url.includes('googleusercontent.com') || 
       user.user_metadata.avatar_url.includes('githubusercontent.com'))) {
    return (
      <div className="relative">
        <OptimizedAvatar
          src={user.user_metadata.avatar_url}
          alt={user.email || 'User avatar'}
          size={size}
          fallback={user.email ? getUserInitials(user.email) : 'U'}
          className={className}
        />
        {showStatus && (
          <span 
            className={`absolute bottom-0 right-0 block rounded-full ring-2 ring-white ${statusSizeClasses[size]} ${statusColors[status]}`}
          />
        )}
      </div>
    )
  }

  // Use regular avatar for local or no image
  return (
    <div className="relative">
      <Avatar className={`${sizeClasses[size]} ${className}`}>
        <AvatarImage 
          src={user?.user_metadata?.avatar_url} 
          alt={user?.email || 'User avatar'} 
        />
        <AvatarFallback>
          {user?.email ? getUserInitials(user.email) : 'U'}
        </AvatarFallback>
      </Avatar>
      {showStatus && (
        <span 
          className={`absolute bottom-0 right-0 block rounded-full ring-2 ring-white ${statusSizeClasses[size]} ${statusColors[status]}`}
        />
      )}
    </div>
  )
}