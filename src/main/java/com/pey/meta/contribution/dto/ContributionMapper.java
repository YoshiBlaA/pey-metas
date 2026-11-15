package com.pey.meta.contribution.dto;

import com.pey.meta.contribution.entity.Contribution;
import com.pey.meta.contribution.entity.ContributionStatus;

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
}