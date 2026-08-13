package com.portable_health_record_system.mapper;

import com.portable_health_record_system.dto.notification.NotificationDto;
import com.portable_health_record_system.entity.notification.Notification;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface NotificationMapper {
    NotificationDto toDto(Notification source);
}
