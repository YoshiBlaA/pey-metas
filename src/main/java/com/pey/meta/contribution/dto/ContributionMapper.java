package com.pey.meta.contribution.dto;

import com.pey.meta.contribution.entity.Contribution;
import com.pey.meta.contribution.entity.ContributionStatus;
import com.pey.meta.goal.dto.GoalMapper;

public final class ContributionMapper {

    private ContributionMapper() {
    }

    public static ContributionCreatedResponse toCreated(Contribution c, Long goalId, String qrImage) {
        return new ContributionCreatedResponse(c.getNumRef(), goalId, c.getAmount(), c.getStatus(),
                c.getExpiresAt(), c.getCodiQrId(), c.getQrString(), qrImage);
    }

    public static ContributionStatusResponse toStatus(Contribution c, ContributionStatus effectiveStatus) {
        return new ContributionStatusResponse(c.getNumRef(), c.getGoal() == null ? null : c.getGoal().getId(),
                effectiveStatus, c.getAmount(), c.getExpiresAt(), c.getPaidAt());
    }

    public static AdminContributionResponse toAdmin(Contribution c, ContributionStatus effectiveStatus) {
        String name = c.getDisplayName() == null ? "" : c.getDisplayName().trim();
        if (c.isAnonymous() || name.isEmpty()) {
            name = GoalMapper.ANONYMOUS_NAME;
        }
        return new AdminContributionResponse(c.getId(), c.getNumRef(), c.getGoal().getId(), c.getGoal().getTitle(),
                name, c.isAnonymous(), c.getMessage(), c.getAmount(), effectiveStatus, c.getCreatedAt(),
                c.getExpiresAt(), c.getPaidAt());
    }
}
