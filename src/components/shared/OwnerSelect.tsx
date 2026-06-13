'use client'

import { useState } from 'react'
import { ChevronsUpDown, Check, UserX } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils/cn'
import { getInitials } from '@/lib/utils/format'

interface OwnerUser {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

interface OwnerSelectProps {
  value: string | null
  onChange: (userId: string | null) => void
  users: OwnerUser[]
  placeholder?: string
  disabled?: boolean
}


export function OwnerSelect({
  value,
  onChange,
  users,
  placeholder = 'Assign owner',
  disabled = false,
}: OwnerSelectProps) {
  const [open, setOpen] = useState(false)
  const selected = users.find((u) => u.id === value) ?? null

  function handleSelect(userId: string | null) {
    onChange(userId)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={placeholder}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {selected ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-xs">{getInitials(selected.name)}</AvatarFallback>
              </Avatar>
              <span>{selected.name}</span>
            </div>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search team..." />
          <CommandList>
            <CommandEmpty>No team members found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => handleSelect(null)}
                className="gap-2 cursor-pointer"
              >
                <UserX className="w-4 h-4 text-gray-400" />
                <span>Unassign</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.name}
                  onSelect={() => handleSelect(user.id)}
                  className="gap-2 cursor-pointer"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm truncate">{user.name}</span>
                    <span className="text-xs text-gray-500 truncate">{user.email}</span>
                  </div>
                  <Check
                    className={cn('ml-auto h-4 w-4 flex-shrink-0', value === user.id ? 'opacity-100' : 'opacity-0')}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
