<permission-widget>
    <section>
        <div show={entity.permissionOwners.length}>
            <label>{localize('Role owners')}</label>
            <div class='role-owners'>
            <span each={r in entity.permissionOwners}>
                <span class="material-icons"
                      onclick={unassignRole}><i>delete</i></span><span>{r.userInfo.name}</span> <span> {r.role}</span>
            </span>
            </div>
        </div>
        <div hide={entity.permissionOwners.length}>No role owners defined yet</div>
        <input type="button" hide={isOpen} onclick={open} value={localize('Set Role')}>
        <div if={isOpen}>
            <div class="role-select" hide={roleName}>
                <label>{localize('Select Role to assign')}</label>
                <span class="tag selectable" each={rn in roleNames} onclick={setRoleName}>{rn}</span>
            </div>
            <div class="role-select" show={roleName}>
                <label class="title">{localize('Choose a '+localize(roleName))}</b></label><br>
                <user-finder callback={selectUser}></user-finder>
            </div>
        </div>
    </section>
    <script>
        let self = this
        this.entityType = self.opts.entity
        entityType = self.opts.entitytype

        roleNames = self.opts.rolename.split(',')

        this.dispatcher.on('permissions', e => {
            if (!e.isRequest && e.data.entityId == self.entity.id) {
                self.entity.permissionOwners = e.data.updateResult.permissionOwners
                self.update()
            }
        })

        open = () => {
            self.isOpen = true
            this.roleName = roleNames.length == 1 ? roleNames[0] : null
        }
        setRoleName = e => {
            self.roleName = e.item.rn.trim()
        }
        selectUser = (user) => {
            self.isOpen = false
            if (user) {
                let userId = user._id
                this.dispatcher.trigger('permission-widget', entityType + ':assign-role-requested', {
                    roleName: self.roleName,
                    entityId: self.entity._id,
                    userId
                })
            } else {
                self.roleName = null
            }
            self.update()
        }
        unassignRole = e => {
            self.services.dialogManager.alert('Removing a role', 'info')
            let userId = e.item.r.userId
            let roleName = e.item.r.role
            this.dispatcher.trigger('permission-widget', entityType + ':unassign-role-requested', {
                roleName,
                entityId: self.entity._id,
                userId
            })
        }

    </script>
</permission-widget>